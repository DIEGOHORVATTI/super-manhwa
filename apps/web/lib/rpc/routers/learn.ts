import { ORPCError } from "@orpc/server";
import {
  mineSentenceSchema,
  reviewGradeSchema,
  saveWordSchema,
  wordStatusSchema,
} from "@packages/contracts";
import { and, asc, count, eq, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";

import * as schema from "@/lib/db/schema";
import { PREMIUM_PRICE_BRL } from "@/lib/learn-pricing";
import { syncAchievements } from "@/lib/learning/achievements-sync";
import { makeCloze } from "@/lib/learning/cloze";
import {
  canLearnNewWord,
  canReview,
  effectivePlan,
  entitlementsFor,
  type Plan,
} from "@/lib/learning/entitlements";
import { type MemoryState, type Rating, schedule } from "@/lib/learning/fsrs";
import { xpFor } from "@/lib/learning/gamification";
import { normalizeLemma } from "@/lib/learning/tokenize";
import { awardXpAndStreak, bumpDaily, getDailyUsage, today } from "@/lib/learning/study-day";
import { getWorkAccess } from "@/lib/perms";
import { createSubscription, mpEnabled } from "@/lib/payments/mercadopago";
import { authed, base } from "../base";
import type { RpcDb, RpcUser } from "../context";

const MAX_QUEUE = 30;
const KNOWN_INTERVAL_DAYS = 21; // graduate to "known" once intervals get long

/** Resolve the user's effective plan from the session user's plan/premiumUntil. */
function planOf(user: RpcUser, now: Date): Plan {
  return effectivePlan(
    (user.plan as Plan) ?? "free",
    user.premiumUntil ? new Date(user.premiumUntil) : null,
    now,
  );
}

/**
 * Set a word's per-user status (creating the dictionary word if needed). The first
 * "learning"/"known" counts as a new word: gated by the freemium cap, rewards XP.
 */
async function setWordStatus(
  context: { user: RpcUser; db: RpcDb },
  { language, lemma, status }: { language: string; lemma: string; status: string },
) {
  const userId = context.user.id;
  const db = context.db;
  const { words, userWords } = schema;

  // Resolve (or create) the dictionary word.
  let [word] = await db
    .select({ id: words.id })
    .from(words)
    .where(and(eq(words.language, language), eq(words.lemma, lemma)))
    .limit(1);
  if (!word) {
    [word] = await db
      .insert(words)
      .values({ language, lemma })
      .onConflictDoNothing()
      .returning({ id: words.id });
    if (!word) {
      [word] = await db
        .select({ id: words.id })
        .from(words)
        .where(and(eq(words.language, language), eq(words.lemma, lemma)))
        .limit(1);
    }
  }

  const [existing] = await db
    .select({ id: userWords.id, status: userWords.status })
    .from(userWords)
    .where(and(eq(userWords.userId, userId), eq(userWords.wordId, word.id)))
    .limit(1);

  const wasTracked = existing && existing.status !== "new";
  const isNowLearned = status === "learning" || status === "known";
  const countsAsNew = !wasTracked && isNowLearned;

  // Freemium gate: only the "new word" transition is capped.
  const date = today();
  const plan = planOf(context.user, new Date());
  if (countsAsNew) {
    const usage = await getDailyUsage(userId, date);
    const ent = entitlementsFor(plan, usage);
    if (!canLearnNewWord(ent)) {
      throw new ORPCError("PAYMENT_REQUIRED", {
        message: "Limite diário de palavras novas atingido. Premium = ilimitado.",
        data: { reason: "daily_limit" },
      });
    }
  }

  const [saved] = existing
    ? await db
        .update(userWords)
        .set({ status })
        .where(eq(userWords.id, existing.id))
        .returning({ id: userWords.id })
    : await db
        .insert(userWords)
        .values({ userId, wordId: word.id, status })
        .returning({ id: userWords.id });

  let profile: { xp: number; streakDays: number } | undefined;
  let unlocked: string[] = [];
  if (countsAsNew) {
    await bumpDaily(userId, date, { newWords: 1, xp: xpFor("newWordLearned") });
    profile = await awardXpAndStreak(userId, xpFor("newWordLearned"), date);
    unlocked = await syncAchievements(userId, profile.streakDays);
  }

  return {
    wordId: word.id,
    userWordId: saved.id,
    status,
    ...(profile ? { profile } : {}),
    ...(unlocked.length ? { unlocked } : {}),
  };
}

/**
 * Language-learning surface (LingQ-style): per-word status tracking, FSRS-scheduled
 * cloze reviews, sentence mining, dashboard stats, tokenized chapter reader and the
 * premium subscription kickoff. Freemium caps gate "new word" learning and reviews;
 * the daily-limit case surfaces as PAYMENT_REQUIRED so the UI can show the upsell.
 */
export const learnRouter = {
  /** Set a word's per-user status; first "learning"/"known" counts as a new word. */
  setWord: authed
    .input(wordStatusSchema)
    .handler(({ input, context }) => setWordStatus(context, input)),

  /**
   * Save a word tapped in the English reader: marks it "learning" and mints its cloze
   * card from the sentence it came from (catalog chapters have no chapter_tokens).
   */
  saveWord: authed.input(saveWordSchema).handler(async ({ input, context }) => {
    const { words, srsCards } = schema;
    const db = context.db;
    const lemma = normalizeLemma(input.word, "en");
    const result = await setWordStatus(context, { language: "en", lemma, status: "learning" });

    if (input.meaning) {
      await db
        .update(words)
        .set({ definition: input.meaning })
        .where(and(eq(words.id, result.wordId), isNull(words.definition)));
    }

    const [card] = await db
      .select({ id: srsCards.id })
      .from(srsCards)
      .where(and(eq(srsCards.userWordId, result.userWordId), eq(srsCards.type, "cloze")))
      .limit(1);
    if (!card) {
      const cloze = makeCloze(input.sentence, input.word);
      await db.insert(srsCards).values({
        userId: context.user.id,
        userWordId: result.userWordId,
        type: "cloze",
        // The meaning on the front makes the blank solvable for a beginner.
        front: input.meaning ? `${cloze.front} (${input.meaning})` : cloze.front,
        back: cloze.back,
      });
    }

    return result;
  }),

  /** Build the due review queue: cloze cards for "learning" words past their due. */
  reviewQueue: authed.handler(async ({ context }) => {
    const userId = context.user.id;
    const db = context.db;

    const plan = planOf(context.user, new Date());
    const usage = await getDailyUsage(userId, today());
    const ent = entitlementsFor(plan, usage);
    if (!canReview(ent)) return { cards: [], limited: true };

    const { userWords, words, chapterTokens, sentences, srsCards } = schema;
    const now = new Date();

    const due = await db
      .select({ userWordId: userWords.id, wordId: userWords.wordId, lemma: words.lemma })
      .from(userWords)
      .innerJoin(words, eq(userWords.wordId, words.id))
      .where(
        and(
          eq(userWords.userId, userId),
          eq(userWords.status, "learning"),
          or(isNull(userWords.due), lte(userWords.due, now)),
        ),
      )
      .limit(
        Math.min(
          MAX_QUEUE,
          Number.isFinite(ent.reviewsRemaining) ? ent.reviewsRemaining : MAX_QUEUE,
        ),
      );

    const cards: Array<{ cardId: number; front: string; back: string }> = [];
    for (const d of due) {
      // Reuse an existing cloze card or mint one from a real sentence with the word.
      let [card] = await db
        .select({ id: srsCards.id, front: srsCards.front, back: srsCards.back })
        .from(srsCards)
        .where(and(eq(srsCards.userWordId, d.userWordId), eq(srsCards.type, "cloze")))
        .limit(1);

      if (!card) {
        const [tok] = await db
          .select({
            chapterId: chapterTokens.chapterId,
            sentenceIdx: chapterTokens.sentenceIdx,
            surface: chapterTokens.surface,
          })
          .from(chapterTokens)
          .where(eq(chapterTokens.lemma, d.lemma))
          .limit(1);
        if (!tok) continue;
        const [sent] = await db
          .select({ id: sentences.id, text: sentences.text })
          .from(sentences)
          .where(and(eq(sentences.chapterId, tok.chapterId), eq(sentences.idx, tok.sentenceIdx)))
          .limit(1);
        if (!sent) continue;
        const cz = makeCloze(sent.text, tok.surface);
        [card] = await db
          .insert(srsCards)
          .values({
            userId,
            userWordId: d.userWordId,
            type: "cloze",
            sentenceId: sent.id,
            front: cz.front,
            back: cz.back,
          })
          .returning({ id: srsCards.id, front: srsCards.front, back: srsCards.back });
      }
      cards.push({ cardId: card.id, front: card.front, back: card.back });
    }

    return { cards };
  }),

  /** Grade a card → run FSRS, reschedule the word, log the review, award XP. */
  gradeReview: authed.input(reviewGradeSchema).handler(async ({ input, context }) => {
    const userId = context.user.id;
    const db = context.db;
    const { srsCards, userWords, reviewLogs } = schema;

    const [card] = await db
      .select({ id: srsCards.id, userWordId: srsCards.userWordId })
      .from(srsCards)
      .where(and(eq(srsCards.id, input.cardId), eq(srsCards.userId, userId)))
      .limit(1);
    if (!card?.userWordId) throw new ORPCError("NOT_FOUND");

    const [uw] = await db
      .select({
        id: userWords.id,
        stability: userWords.stability,
        difficulty: userWords.difficulty,
        reps: userWords.reps,
        lapses: userWords.lapses,
        lastReviewedAt: userWords.lastReviewedAt,
      })
      .from(userWords)
      .where(eq(userWords.id, card.userWordId))
      .limit(1);
    if (!uw) throw new ORPCError("NOT_FOUND");

    const now = new Date();
    const elapsedDays = uw.lastReviewedAt
      ? Math.max(0, (now.getTime() - new Date(uw.lastReviewedAt).getTime()) / 86_400_000)
      : 0;
    const state: MemoryState = {
      stability: uw.stability / 1000,
      difficulty: uw.difficulty / 1000,
      reps: uw.reps,
      lapses: uw.lapses,
    };
    const next = schedule(state, input.rating as Rating, elapsedDays);
    const graduated = next.intervalDays >= KNOWN_INTERVAL_DAYS && input.rating >= 3;

    await db
      .update(userWords)
      .set({
        stability: Math.round(next.stability * 1000),
        difficulty: Math.round(next.difficulty * 1000),
        reps: next.reps,
        lapses: next.lapses,
        due: new Date(now.getTime() + next.intervalDays * 86_400_000),
        lastReviewedAt: now,
        status: graduated ? "known" : "learning",
      })
      .where(eq(userWords.id, uw.id));

    await db.insert(reviewLogs).values({
      cardId: card.id,
      userId,
      rating: input.rating,
      stability: Math.round(next.stability * 1000),
      difficulty: Math.round(next.difficulty * 1000),
    });

    const date = today();
    await bumpDaily(userId, date, { reviews: 1, xp: xpFor("reviewDone") });
    const profile = await awardXpAndStreak(userId, xpFor("reviewDone"), date);
    const unlocked = await syncAchievements(userId, profile.streakDays);

    return {
      intervalDays: next.intervalDays,
      status: graduated ? "known" : "learning",
      profile,
      ...(unlocked.length ? { unlocked } : {}),
    };
  }),

  /** Sentence mining | turn a real sentence into a review card. Premium feature. */
  mine: authed.input(mineSentenceSchema).handler(async ({ input, context }) => {
    const plan = planOf(context.user, new Date());
    if (!entitlementsFor(plan, { newWords: 0, reviews: 0 }).canMineSentences) {
      throw new ORPCError("PAYMENT_REQUIRED", {
        message: "Sentence mining é um recurso Premium.",
        data: { reason: "premium_only" },
      });
    }

    const db = context.db;
    const { sentences, srsCards } = schema;
    const [sent] = await db
      .select({ id: sentences.id, text: sentences.text })
      .from(sentences)
      .where(eq(sentences.id, input.sentenceId))
      .limit(1);
    if (!sent) throw new ORPCError("NOT_FOUND");

    const [card] = await db
      .insert(srsCards)
      .values({
        userId: context.user.id,
        type: "sentence",
        sentenceId: sent.id,
        front: sent.text,
        back: input.note,
      })
      .returning({ id: srsCards.id });

    return { card };
  }),

  /** Dashboard data: profile, vocab counts, today's progress, due reviews, plan. */
  stats: authed.handler(async ({ context }) => {
    const userId = context.user.id;
    const db = context.db;
    const { userWords, userAchievements } = schema;
    const now = new Date();

    const [known] = await db
      .select({ n: count() })
      .from(userWords)
      .where(and(eq(userWords.userId, userId), eq(userWords.status, "known")));
    const [learning] = await db
      .select({ n: count() })
      .from(userWords)
      .where(and(eq(userWords.userId, userId), eq(userWords.status, "learning")));
    const [due] = await db
      .select({ n: count() })
      .from(userWords)
      .where(
        and(
          eq(userWords.userId, userId),
          eq(userWords.status, "learning"),
          or(isNull(userWords.due), lte(userWords.due, now)),
        ),
      );
    const achievements = await db
      .select({ key: userAchievements.achievementKey })
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));

    const u = context.user as RpcUser & { xp?: number; streakDays?: number; dailyGoal?: number };
    const plan = planOf(u, now);
    const usage = await getDailyUsage(userId, today());
    const ent = entitlementsFor(plan, usage);

    return {
      xp: u.xp ?? 0,
      streakDays: u.streakDays ?? 0,
      dailyGoal: u.dailyGoal ?? 20,
      plan,
      counts: { known: known.n, learning: learning.n },
      today: usage,
      dueCount: due.n,
      achievements: achievements.map((a) => a.key),
      entitlements: {
        premium: ent.premium,
        newWordsRemaining: Number.isFinite(ent.newWordsRemaining) ? ent.newWordsRemaining : null,
        canExportAnki: ent.canExportAnki,
      },
    };
  }),

  /** Tokenized chapter for the interactive reader + the user's per-word statuses. */
  chapter: base.input(z.object({ id: z.number().int() })).handler(async ({ input, context }) => {
    if (!context.db) throw new ORPCError("SERVICE_UNAVAILABLE");
    const chapterId = input.id;
    const db = context.db;
    const { userChapters, userWorks, chapterTokens, words, userWords } = schema;

    const [chapter] = await db
      .select({ id: userChapters.id, workId: userChapters.workId, status: userChapters.status })
      .from(userChapters)
      .where(eq(userChapters.id, chapterId))
      .limit(1);
    if (!chapter) throw new ORPCError("NOT_FOUND");

    const [work] = await db
      .select({ language: userWorks.language, kind: userWorks.kind, title: userWorks.title })
      .from(userWorks)
      .where(eq(userWorks.id, chapter.workId))
      .limit(1);
    if (!work || work.kind !== "novel" || !work.language) {
      throw new ORPCError("BAD_REQUEST", { message: "not_a_novel" });
    }

    const userId = context.session?.user?.id ?? null;
    if (chapter.status !== "published") {
      const access = await getWorkAccess(chapter.workId, userId);
      if (!access.role) throw new ORPCError("FORBIDDEN");
    }

    const tokens = await db
      .select({
        idx: chapterTokens.idx,
        sentenceIdx: chapterTokens.sentenceIdx,
        surface: chapterTokens.surface,
        lemma: chapterTokens.lemma,
        isWord: chapterTokens.isWord,
      })
      .from(chapterTokens)
      .where(eq(chapterTokens.chapterId, chapterId))
      .orderBy(asc(chapterTokens.idx));

    // The user's vocabulary for this language → lemma -> status map.
    const statuses: Record<string, string> = {};
    let known = 0;
    let learning = 0;
    if (userId) {
      const vocab = await db
        .select({ lemma: words.lemma, status: userWords.status })
        .from(userWords)
        .innerJoin(words, eq(userWords.wordId, words.id))
        .where(and(eq(userWords.userId, userId), eq(words.language, work.language)));
      for (const v of vocab) {
        statuses[v.lemma] = v.status;
        if (v.status === "known") known++;
        else if (v.status === "learning") learning++;
      }
    }

    return {
      language: work.language,
      title: work.title,
      tokens,
      statuses,
      counts: { known, learning },
    };
  }),

  /** Start a premium subscription (Mercado Pago preapproval); returns checkout URL. */
  subscribe: authed.handler(async ({ context }) => {
    if (!mpEnabled) throw new ORPCError("SERVICE_UNAVAILABLE");
    const user = context.user as RpcUser & { email: string };

    const origin = new URL(context.headers.get("origin") ?? "http://localhost").origin;
    const sub = await createSubscription({
      email: user.email,
      amount: PREMIUM_PRICE_BRL,
      reason: "Super Manhwa | Premium (aprendizado de idiomas)",
      backUrl: `${origin}/learn?upgraded=1`,
    });

    const { subscriptions } = schema;
    await context.db.insert(subscriptions).values({
      userId: user.id,
      provider: "mercadopago",
      providerSubId: sub.id,
      status: sub.status,
    });

    return { initPoint: sub.initPoint, status: sub.status };
  }),
};
