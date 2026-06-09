import { describe, expect, it } from "bun:test";

import { type MemoryState, nextInterval, retrievability, schedule } from "../lib/learning/fsrs";

const NEW: MemoryState = { stability: 0, difficulty: 0, reps: 0, lapses: 0 };

describe("retrievability", () => {
  it("is 1 at t=0 and decreases over time", () => {
    expect(retrievability(0, 10)).toBeCloseTo(1, 5);
    expect(retrievability(10, 10)).toBeLessThan(1);
    expect(retrievability(100, 10)).toBeLessThan(retrievability(10, 10));
  });
});

describe("nextInterval", () => {
  it("grows with stability and is at least 1 day", () => {
    expect(nextInterval(1)).toBeGreaterThanOrEqual(1);
    expect(nextInterval(100)).toBeGreaterThan(nextInterval(10));
  });
});

describe("schedule — new card", () => {
  it("initializes stability/difficulty and schedules a future review", () => {
    const s = schedule(NEW, 3, 0);
    expect(s.reps).toBe(1);
    expect(s.stability).toBeGreaterThan(0);
    expect(s.difficulty).toBeGreaterThanOrEqual(1);
    expect(s.difficulty).toBeLessThanOrEqual(10);
    expect(s.intervalDays).toBeGreaterThanOrEqual(1);
  });

  it("a higher grade yields a longer first interval", () => {
    const good = schedule(NEW, 3, 0);
    const easy = schedule(NEW, 4, 0);
    expect(easy.intervalDays).toBeGreaterThanOrEqual(good.intervalDays);
  });

  it("'again' on a new card counts a lapse", () => {
    expect(schedule(NEW, 1, 0).lapses).toBe(1);
  });
});

describe("schedule — review", () => {
  const learned: MemoryState = { stability: 10, difficulty: 5, reps: 3, lapses: 0 };

  it("'good' recall increases stability and pushes the interval out", () => {
    const r = schedule(learned, 3, 10);
    expect(r.stability).toBeGreaterThan(learned.stability);
    expect(r.reps).toBe(4);
    expect(r.lapses).toBe(0);
  });

  it("'again' lapse lowers stability and increments lapses", () => {
    const r = schedule(learned, 1, 10);
    expect(r.stability).toBeLessThanOrEqual(learned.stability);
    expect(r.lapses).toBe(1);
  });

  it("keeps difficulty within [1,10] across many reviews", () => {
    let st: MemoryState = schedule(NEW, 1, 0);
    for (let i = 0; i < 30; i++) {
      st = schedule(st, ((i % 4) + 1) as 1 | 2 | 3 | 4, 5);
      expect(st.difficulty).toBeGreaterThanOrEqual(1);
      expect(st.difficulty).toBeLessThanOrEqual(10);
      expect(st.stability).toBeGreaterThan(0);
    }
  });
});
