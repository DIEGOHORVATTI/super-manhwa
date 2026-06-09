import { and, eq, isNull, lte, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { syncAchievements } from "@/lib/learning/achievements-sync";
import { makeCloze } from "@/lib/learning/cloze";
import { canReview, effectivePlan, entitlementsFor, type Plan } from "@/lib/learning/entitlements";
import { xpFor } from "@/lib/learning/gamification";
import { type MemoryState, type Rating, schedule } from "@/lib/learning/fsrs";
import { awardXpAndStreak, bumpDaily, getDailyUsage, today } from "@/lib/learning/study-day";
import { reviewGradeSchema } from "@/lib/schemas/learn";

const MAX_QUEUE = 30;
const KNOWN_INTERVAL_DAYS = 21; // graduate to "known" once intervals get long

/** Build the due review queue: cloze cards for "learning" words past their due. */
export async function GET() {
  if (!dbEnabled) return NextResponse.json({ cards: [] });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const u = session.user as { plan?: string; premiumUntil?: string | null };
  const plan = effectivePlan(
    (u.plan as Plan) ?? "free",
    u.premiumUntil ? new Date(u.premiumUntil) : null,
    new Date(),
  );
  const usage = await getDailyUsage(userId, today());
  const ent = entitlementsFor(plan, usage);
  if (!canReview(ent)) {
    return NextResponse.json({ cards: [], limited: true });
  }

  const db = getDb();
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
      Math.min(MAX_QUEUE, Number.isFinite(ent.reviewsRemaining) ? ent.reviewsRemaining : MAX_QUEUE),
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

  return NextResponse.json({ cards });
}

/** Grade a card → run FSRS, reschedule the word, log the review, award XP. */
export async function POST(req: Request) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const parsed = reviewGradeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = getDb();
  const { srsCards, userWords, reviewLogs } = schema;
  const [card] = await db
    .select({ id: srsCards.id, userWordId: srsCards.userWordId })
    .from(srsCards)
    .where(and(eq(srsCards.id, parsed.data.cardId), eq(srsCards.userId, userId)))
    .limit(1);
  if (!card?.userWordId) return NextResponse.json({ error: "not_found" }, { status: 404 });

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
  if (!uw) return NextResponse.json({ error: "not_found" }, { status: 404 });

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
  const next = schedule(state, parsed.data.rating as Rating, elapsedDays);
  const graduated = next.intervalDays >= KNOWN_INTERVAL_DAYS && parsed.data.rating >= 3;

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
    rating: parsed.data.rating,
    stability: Math.round(next.stability * 1000),
    difficulty: Math.round(next.difficulty * 1000),
  });

  const date = today();
  await bumpDaily(userId, date, { reviews: 1, xp: xpFor("reviewDone") });
  const profile = await awardXpAndStreak(userId, xpFor("reviewDone"), date);
  const unlocked = await syncAchievements(userId, profile.streakDays);

  return NextResponse.json({
    intervalDays: next.intervalDays,
    status: graduated ? "known" : "learning",
    profile,
    ...(unlocked.length ? { unlocked } : {}),
  });
}
