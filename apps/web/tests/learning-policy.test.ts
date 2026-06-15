import { describe, expect, it } from "bun:test";

import {
  canLearnNewWord,
  effectivePlan,
  entitlementsFor,
  FREE_LIMITS,
} from "../lib/learning/entitlements";
import { applyStudyDay, dayDiff, newlyUnlocked, xpFor } from "../lib/learning/gamification";
import { makeCloze } from "../lib/learning/cloze";

describe("entitlements", () => {
  it("premium is unlimited and unlocks everything", () => {
    const e = entitlementsFor("premium", { newWords: 999, reviews: 999 });
    expect(e.newWordsRemaining).toBe(Number.POSITIVE_INFINITY);
    expect(e.canExportAnki).toBe(true);
    expect(e.canMineSentences).toBe(true);
  });

  it("free caps new words per day and locks premium features", () => {
    const e = entitlementsFor("free", { newWords: 5, reviews: 0 });
    expect(e.newWordsRemaining).toBe(FREE_LIMITS.newWordsPerDay - 5);
    expect(e.canExportAnki).toBe(false);
    expect(canLearnNewWord(e)).toBe(true);
  });

  it("free blocks once the daily cap is hit", () => {
    const e = entitlementsFor("free", { newWords: FREE_LIMITS.newWordsPerDay, reviews: 0 });
    expect(e.newWordsRemaining).toBe(0);
    expect(canLearnNewWord(e)).toBe(false);
  });

  it("effectivePlan downgrades expired premium", () => {
    const now = new Date("2026-06-09T00:00:00Z");
    expect(effectivePlan("premium", new Date("2026-06-08T00:00:00Z"), now)).toBe("free");
    expect(effectivePlan("premium", new Date("2026-07-01T00:00:00Z"), now)).toBe("premium");
    expect(effectivePlan("free", null, now)).toBe("free");
  });
});

describe("gamification", () => {
  it("xpFor scales by count", () => {
    expect(xpFor("reviewDone", 3)).toBe(15);
    expect(xpFor("newWordLearned")).toBe(10);
  });

  it("dayDiff counts whole days", () => {
    expect(dayDiff("2026-06-08", "2026-06-09")).toBe(1);
    expect(dayDiff("2026-06-01", "2026-06-08")).toBe(7);
  });

  it("streak: same day unchanged, next day +1, gap resets", () => {
    expect(applyStudyDay({ streakDays: 3, lastStudyDate: "2026-06-09" }, "2026-06-09")).toEqual({
      streakDays: 3,
      lastStudyDate: "2026-06-09",
    });
    expect(applyStudyDay({ streakDays: 3, lastStudyDate: "2026-06-08" }, "2026-06-09")).toEqual({
      streakDays: 4,
      lastStudyDate: "2026-06-09",
    });
    expect(applyStudyDay({ streakDays: 3, lastStudyDate: "2026-06-05" }, "2026-06-09")).toEqual({
      streakDays: 1,
      lastStudyDate: "2026-06-09",
    });
  });

  it("first study ever starts a streak of 1", () => {
    expect(applyStudyDay({ streakDays: 0, lastStudyDate: null }, "2026-06-09")).toEqual({
      streakDays: 1,
      lastStudyDate: "2026-06-09",
    });
  });

  it("achievements unlock at thresholds, not twice", () => {
    const m = { knownWords: 100, streakDays: 7, chaptersCompleted: 1 };
    expect(newlyUnlocked(m, new Set()).sort()).toEqual(
      ["first_chapter", "streak_7", "words_100"].sort(),
    );
    expect(newlyUnlocked(m, new Set(["words_100", "streak_7", "first_chapter"]))).toEqual([]);
  });
});

describe("cloze", () => {
  it("blanks the target inside the real sentence", () => {
    const c = makeCloze("O gato dorme no sofá.", "gato");
    expect(c.back).toBe("gato");
    expect(c.front).not.toContain("gato");
    expect(c.front).toContain("O ");
    expect(c.front).toContain("dorme");
  });

  it("is case-insensitive and matches whole words only", () => {
    const c = makeCloze("The cat sat.", "Cat");
    expect(c.back.toLowerCase()).toBe("cat");
    expect(c.front).toContain("sat");
  });

  it("falls back when the surface is absent", () => {
    const c = makeCloze("Texto sem alvo.", "inexistente");
    expect(c.back).toBe("inexistente");
  });
});
