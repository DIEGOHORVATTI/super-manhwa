import "server-only";
import { and, eq, sql } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import { applyStudyDay } from "@/lib/learning/gamification";

/** Server-day (UTC) as YYYY-MM-DD. MVP: a user-timezone refinement comes later. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Today's counters for a user (zeros if no row yet). */
export async function getDailyUsage(userId: string, date: string) {
  const db = getDb();
  const { dailyActivity } = schema;
  const [row] = await db
    .select({ newWords: dailyActivity.newWords, reviews: dailyActivity.reviews })
    .from(dailyActivity)
    .where(and(eq(dailyActivity.userId, userId), eq(dailyActivity.date, date)))
    .limit(1);
  return { newWords: row?.newWords ?? 0, reviews: row?.reviews ?? 0 };
}

/** Increment today's counters (upsert). */
export async function bumpDaily(
  userId: string,
  date: string,
  delta: { newWords?: number; reviews?: number; xp?: number },
) {
  const db = getDb();
  const { dailyActivity } = schema;
  const nw = delta.newWords ?? 0;
  const rv = delta.reviews ?? 0;
  const xp = delta.xp ?? 0;
  await db
    .insert(dailyActivity)
    .values({ userId, date, newWords: nw, reviews: rv, xp })
    .onConflictDoUpdate({
      target: [dailyActivity.userId, dailyActivity.date],
      set: {
        newWords: sql`${dailyActivity.newWords} + ${nw}`,
        reviews: sql`${dailyActivity.reviews} + ${rv}`,
        xp: sql`${dailyActivity.xp} + ${xp}`,
      },
    });
}

/** Award XP and advance the streak for a study action. Returns the new profile. */
export async function awardXpAndStreak(userId: string, xpGain: number, date: string) {
  const db = getDb();
  const { user } = schema;
  const [u] = await db
    .select({ xp: user.xp, streakDays: user.streakDays, lastStudyDate: user.lastStudyDate })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  const streak = applyStudyDay(
    { streakDays: u?.streakDays ?? 0, lastStudyDate: u?.lastStudyDate ?? null },
    date,
  );
  await db
    .update(user)
    .set({
      xp: (u?.xp ?? 0) + xpGain,
      streakDays: streak.streakDays,
      lastStudyDate: streak.lastStudyDate,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));
  return { xp: (u?.xp ?? 0) + xpGain, streakDays: streak.streakDays };
}
