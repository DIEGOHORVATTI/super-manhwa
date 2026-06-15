import "server-only";
import { countDistinct, eq, sql } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import { newlyUnlockedReading } from "@/lib/reading";

/** Seeded definitions for reading achievements (FK target in `achievements`). */
const CATALOG: Record<string, { name: string; description: string }> = {
  read_10_works: { name: "Leitor", description: "Leu capítulos de 10 obras" },
  read_50_works: { name: "Devorador", description: "Leu capítulos de 50 obras" },
  read_100_chapters: { name: "Maratonista", description: "Leu 100 capítulos" },
  read_500_chapters: { name: "Lenda da leitura", description: "Leu 500 capítulos" },
};

/**
 * Aggregates the user's reading (distinct works + total chapters from
 * `readingEvents`) and unlocks any newly-earned reading achievements. Idempotent;
 * mirrors `syncAchievements` for the learning side.
 */
export async function syncReadingAchievements(userId: string): Promise<string[]> {
  const db = getDb();
  const { readingEvents, achievements, userAchievements } = schema;

  const [agg] = await db
    .select({
      works: countDistinct(readingEvents.workId),
      chapters: sql<number>`count(*)`,
    })
    .from(readingEvents)
    .where(eq(readingEvents.userId, userId));

  const already = await db
    .select({ key: userAchievements.achievementKey })
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));
  const have = new Set(already.map((a) => a.key));

  const fresh = newlyUnlockedReading(
    { works: Number(agg?.works ?? 0), chapters: Number(agg?.chapters ?? 0) },
    have,
  );
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
