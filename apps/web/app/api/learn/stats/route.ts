import { and, count, eq, isNull, lte, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { effectivePlan, entitlementsFor, type Plan } from "@/lib/learning/entitlements";
import { getDailyUsage, today } from "@/lib/learning/study-day";

/** Dashboard data: profile, vocab counts, today's progress, due reviews, plan. */
export async function GET() {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const db = getDb();
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

  const u = session.user as {
    plan?: string;
    premiumUntil?: string | null;
    xp?: number;
    streakDays?: number;
    dailyGoal?: number;
  };
  const plan = effectivePlan(
    (u.plan as Plan) ?? "free",
    u.premiumUntil ? new Date(u.premiumUntil) : null,
    now,
  );
  const usage = await getDailyUsage(userId, today());
  const ent = entitlementsFor(plan, usage);

  return NextResponse.json({
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
  });
}
