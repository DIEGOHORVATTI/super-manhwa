import "server-only";
import { and, count, eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import { newlyUnlocked } from "@/lib/learning/gamification";

/** Static achievement catalog (key → label/description), seeded on demand. */
const CATALOG: Record<string, { name: string; description: string }> = {
  words_100: { name: "Centena", description: "100 palavras conhecidas" },
  words_1000: { name: "Milhar", description: "1.000 palavras conhecidas" },
  streak_7: { name: "Semana de fogo", description: "7 dias seguidos estudando" },
  streak_30: { name: "Mês de fogo", description: "30 dias seguidos estudando" },
  first_chapter: { name: "Primeiro capítulo", description: "Leu seu primeiro capítulo" },
};

/**
 * Unlock any achievements the user now qualifies for. Idempotent — seeds the
 * achievement definition then inserts the user link if missing. Called after
 * study actions (cheap: a count + a small read/insert).
 */
export async function syncAchievements(userId: string, streakDays: number): Promise<string[]> {
  const db = getDb();
  const { userWords, achievements, userAchievements } = schema;

  const [known] = await db
    .select({ n: count() })
    .from(userWords)
    .where(and(eq(userWords.userId, userId), eq(userWords.status, "known")));

  const already = await db
    .select({ key: userAchievements.achievementKey })
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));
  const haveSet = new Set(already.map((a) => a.key));

  const fresh = newlyUnlocked({ knownWords: known.n, streakDays, chaptersCompleted: 0 }, haveSet);
  for (const key of fresh) {
    const def = CATALOG[key];
    if (!def) continue;
    await db
      .insert(achievements)
      .values({ key, name: def.name, description: def.description })
      .onConflictDoNothing();
    await db.insert(userAchievements).values({ userId, achievementKey: key }).onConflictDoNothing();
  }
  return fresh;
}
