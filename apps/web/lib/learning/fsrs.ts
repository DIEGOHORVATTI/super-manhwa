/**
 * FSRS (Free Spaced Repetition Scheduler) | compact, dependency-free port of the
 * FSRS-5 long-term formulas. Pure math, NO AI. Given a card's memory state and a
 * grade (1=again, 2=hard, 3=good, 4=easy) it returns the next state + interval.
 *
 * `stability` is measured in days; `difficulty` in [1,10]. The DB stores both as
 * x1000 integers (see schema) | convert at the persistence boundary, compute here
 * in floats. Same-day "short-term" steps (w17/w18) are intentionally omitted for
 * the MVP; intervals are full-day.
 */
export type Rating = 1 | 2 | 3 | 4;

export interface MemoryState {
  stability: number; // days
  difficulty: number; // 1..10
  reps: number;
  lapses: number;
}

export interface Scheduled extends MemoryState {
  intervalDays: number; // until next review
}

const W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925,
  1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
];

const DECAY = -0.5;
const FACTOR = 19 / 81; // 0.9^(1/DECAY) - 1
const REQUEST_RETENTION = 0.9;
const MIN_S = 0.1;

const clampDifficulty = (d: number) => Math.min(Math.max(d, 1), 10);

/** Probability of recall after `t` days given stability `s`. */
export function retrievability(t: number, s: number): number {
  return (1 + (FACTOR * t) / s) ** DECAY;
}

/** Optimal next interval (days) for the target retention. */
export function nextInterval(stability: number): number {
  const raw = (stability / FACTOR) * (REQUEST_RETENTION ** (1 / DECAY) - 1);
  return Math.max(1, Math.round(raw));
}

function initStability(rating: Rating): number {
  return Math.max(W[rating - 1], MIN_S);
}

function initDifficulty(rating: Rating): number {
  return clampDifficulty(W[4] - Math.exp(W[5] * (rating - 1)) + 1);
}

function nextDifficulty(d: number, rating: Rating): number {
  const delta = -W[6] * (rating - 3);
  const damped = d + delta * ((10 - d) / 9);
  // mean reversion toward the "easy" baseline difficulty
  const reverted = W[7] * initDifficulty(4) + (1 - W[7]) * damped;
  return clampDifficulty(reverted);
}

function recallStability(d: number, s: number, r: number, rating: Rating): number {
  const hard = rating === 2 ? W[15] : 1;
  const easy = rating === 4 ? W[16] : 1;
  const inc =
    Math.exp(W[8]) * (11 - d) * s ** -W[9] * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy;
  return Math.max(MIN_S, s * (1 + inc));
}

function forgetStability(d: number, s: number, r: number): number {
  const sf = W[11] * d ** -W[12] * ((s + 1) ** W[13] - 1) * Math.exp(W[14] * (1 - r));
  return Math.max(MIN_S, Math.min(sf, s)); // never exceed current stability on a lapse
}

/**
 * Schedule a review. For a brand-new card pass `state.reps === 0`; `elapsedDays`
 * is ignored then. Returns the updated memory state + the next interval in days.
 */
export function schedule(state: MemoryState, rating: Rating, elapsedDays: number): Scheduled {
  if (state.reps === 0) {
    const stability = initStability(rating);
    const difficulty = initDifficulty(rating);
    return {
      stability,
      difficulty,
      reps: 1,
      lapses: rating === 1 ? 1 : 0,
      intervalDays: nextInterval(stability),
    };
  }

  const r = retrievability(Math.max(0, elapsedDays), state.stability);
  const difficulty = nextDifficulty(state.difficulty, rating);
  const stability =
    rating === 1
      ? forgetStability(difficulty, state.stability, r)
      : recallStability(difficulty, state.stability, r, rating);

  return {
    stability,
    difficulty,
    reps: state.reps + 1,
    lapses: state.lapses + (rating === 1 ? 1 : 0),
    intervalDays: nextInterval(stability),
  };
}
