/**
 * Reading-achievement rules — pure, unit-testable. Reading stats are aggregated
 * from the `readingEvents` table (distinct works + total chapters read); the
 * unlock keys match the badge catalog in `lib/badges.ts`.
 */
export interface ReadingStats {
  works: number; // distinct works the user has read a chapter of
  chapters: number; // total distinct chapters read
}

const RULES: Array<{ key: string; test: (s: ReadingStats) => boolean }> = [
  { key: "read_10_works", test: (s) => s.works >= 10 },
  { key: "read_50_works", test: (s) => s.works >= 50 },
  { key: "read_100_chapters", test: (s) => s.chapters >= 100 },
  { key: "read_500_chapters", test: (s) => s.chapters >= 500 },
];

/** Reading achievement keys earned now that weren't already unlocked. */
export function newlyUnlockedReading(stats: ReadingStats, already: ReadonlySet<string>): string[] {
  return RULES.filter((r) => !already.has(r.key) && r.test(stats)).map((r) => r.key);
}

export const READING_ACHIEVEMENTS = RULES.map((r) => r.key);
