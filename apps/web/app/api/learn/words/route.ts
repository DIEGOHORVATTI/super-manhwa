import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { syncAchievements } from "@/lib/learning/achievements-sync";
import {
  canLearnNewWord,
  effectivePlan,
  entitlementsFor,
  type Plan,
} from "@/lib/learning/entitlements";
import { xpFor } from "@/lib/learning/gamification";
import { awardXpAndStreak, bumpDaily, getDailyUsage, today } from "@/lib/learning/study-day";
import { wordStatusSchema } from "@/lib/schemas/learn";

/**
 * Set a word's per-user status. Moving a word into "learning"/"known" for the
 * first time counts as a "new word" — gated by the freemium daily cap — and
 * awards XP + advances the streak.
 */
export async function POST(req: Request) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = wordStatusSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { language, lemma, status } = parsed.data;
  const userId = session.user.id;

  const db = getDb();
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
  const u = session.user as { plan?: string; premiumUntil?: string | null };
  const plan = effectivePlan(
    (u.plan as Plan) ?? "free",
    u.premiumUntil ? new Date(u.premiumUntil) : null,
    new Date(),
  );
  const date = today();
  if (countsAsNew) {
    const usage = await getDailyUsage(userId, date);
    const ent = entitlementsFor(plan, usage);
    if (!canLearnNewWord(ent)) {
      return NextResponse.json(
        {
          error: "daily_limit",
          message: "Limite diário de palavras novas atingido. Premium = ilimitado.",
        },
        { status: 402 },
      );
    }
  }

  if (existing) {
    await db.update(userWords).set({ status }).where(eq(userWords.id, existing.id));
  } else {
    await db.insert(userWords).values({ userId, wordId: word.id, status });
  }

  let profile: { xp: number; streakDays: number } | undefined;
  let unlocked: string[] = [];
  if (countsAsNew) {
    await bumpDaily(userId, date, { newWords: 1, xp: xpFor("newWordLearned") });
    profile = await awardXpAndStreak(userId, xpFor("newWordLearned"), date);
    unlocked = await syncAchievements(userId, profile.streakDays);
  }

  return NextResponse.json({
    status,
    ...(profile ? { profile } : {}),
    ...(unlocked.length ? { unlocked } : {}),
  });
}
