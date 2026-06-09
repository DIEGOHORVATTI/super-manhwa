/**
 * Freemium gating — pure policy, unit-testable. Given the user's plan and today's
 * usage, decides what's allowed. Free users hit a daily cap on new words and a
 * cap on review cards, and premium-only features (cloze beyond a teaser, sentence
 * mining, Anki export, advanced stats) are locked. Premium = unlimited.
 */
export type Plan = "free" | "premium";

export const FREE_LIMITS = {
  newWordsPerDay: 20,
  reviewCardsPerDay: 100,
} as const;

export interface DailyUsage {
  newWords: number;
  reviews: number;
}

export interface Entitlements {
  premium: boolean;
  newWordsRemaining: number; // Infinity for premium
  reviewsRemaining: number;
  canMineSentences: boolean;
  canExportAnki: boolean;
  canUseAdvancedStats: boolean;
}

/** Resolve the effective plan (premium expires when `premiumUntil` passes). */
export function effectivePlan(plan: Plan, premiumUntil: Date | null | undefined, now: Date): Plan {
  if (plan !== "premium") return "free";
  if (premiumUntil && premiumUntil.getTime() < now.getTime()) return "free";
  return "premium";
}

export function entitlementsFor(plan: Plan, usage: DailyUsage): Entitlements {
  if (plan === "premium") {
    return {
      premium: true,
      newWordsRemaining: Number.POSITIVE_INFINITY,
      reviewsRemaining: Number.POSITIVE_INFINITY,
      canMineSentences: true,
      canExportAnki: true,
      canUseAdvancedStats: true,
    };
  }
  return {
    premium: false,
    newWordsRemaining: Math.max(0, FREE_LIMITS.newWordsPerDay - usage.newWords),
    reviewsRemaining: Math.max(0, FREE_LIMITS.reviewCardsPerDay - usage.reviews),
    canMineSentences: false,
    canExportAnki: false,
    canUseAdvancedStats: false,
  };
}

/** Quick gate helpers for route handlers. */
export const canLearnNewWord = (e: Entitlements) => e.newWordsRemaining > 0;
export const canReview = (e: Entitlements) => e.reviewsRemaining > 0;
