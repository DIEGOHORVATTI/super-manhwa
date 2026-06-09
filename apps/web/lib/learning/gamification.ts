/**
 * Gamification math — pure, no DB. XP rewards, daily streak transitions and
 * achievement checks. Dates are "YYYY-MM-DD" local-day strings so streaks are
 * timezone-stable once the caller picks the user's day.
 */
export const XP = {
  wordRead: 1,
  newWordLearned: 10,
  reviewDone: 5,
  chapterCompleted: 50,
} as const;

export type XpEvent = keyof typeof XP;

export function xpFor(event: XpEvent, count = 1): number {
  return XP[event] * count;
}

/** Difference in whole days between two YYYY-MM-DD strings (b - a). */
export function dayDiff(a: string, b: string): number {
  const da = Date.parse(`${a}T00:00:00Z`);
  const db = Date.parse(`${b}T00:00:00Z`);
  return Math.round((db - da) / 86_400_000);
}

export interface StreakState {
  streakDays: number;
  lastStudyDate: string | null;
}

/**
 * Apply a study day. Same day → unchanged; next day → +1; gap → reset to 1.
 * Returns the new streak state (idempotent within a day).
 */
export function applyStudyDay(state: StreakState, today: string): StreakState {
  if (state.lastStudyDate === today) return state;
  if (state.lastStudyDate == null) return { streakDays: 1, lastStudyDate: today };
  const gap = dayDiff(state.lastStudyDate, today);
  if (gap === 1) return { streakDays: state.streakDays + 1, lastStudyDate: today };
  if (gap <= 0) return state; // clock skew / out-of-order — keep
  return { streakDays: 1, lastStudyDate: today };
}

/** Achievements unlocked when a metric crosses a threshold. */
export interface Metrics {
  knownWords: number;
  streakDays: number;
  chaptersCompleted: number;
}

const RULES: Array<{ key: string; test: (m: Metrics) => boolean }> = [
  { key: "words_100", test: (m) => m.knownWords >= 100 },
  { key: "words_1000", test: (m) => m.knownWords >= 1000 },
  { key: "streak_7", test: (m) => m.streakDays >= 7 },
  { key: "streak_30", test: (m) => m.streakDays >= 30 },
  { key: "first_chapter", test: (m) => m.chaptersCompleted >= 1 },
];

/** Keys earned now that weren't already unlocked. */
export function newlyUnlocked(metrics: Metrics, already: ReadonlySet<string>): string[] {
  return RULES.filter((r) => !already.has(r.key) && r.test(metrics)).map((r) => r.key);
}

export const ACHIEVEMENTS = RULES.map((r) => r.key);
