import { describe, expect, it } from "bun:test";

import { BLOCK_PRICE_CENTS, GRID, isFree, isValidRect, overlaps, priceCents } from "../lib/pixels";

describe("priceCents", () => {
  it("is blocks × block price", () => {
    expect(priceCents({ x: 0, y: 0, w: 1, h: 1 })).toBe(BLOCK_PRICE_CENTS);
    expect(priceCents({ x: 0, y: 0, w: 5, h: 4 })).toBe(20 * BLOCK_PRICE_CENTS);
  });
});

describe("isValidRect", () => {
  it("accepts in-bounds rectangles of any size (no per-purchase cap)", () => {
    expect(isValidRect({ x: 0, y: 0, w: 5, h: 5 })).toBe(true);
    expect(isValidRect({ x: GRID.cols - 1, y: GRID.rows - 1, w: 1, h: 1 })).toBe(true);
    expect(isValidRect({ x: 0, y: 0, w: GRID.cols, h: GRID.rows })).toBe(true); // whole board
  });
  it("rejects out-of-bounds, non-integer, negative", () => {
    expect(isValidRect({ x: GRID.cols - 1, y: 0, w: 5, h: 1 })).toBe(false); // overflows right
    expect(isValidRect({ x: 0, y: 0, w: 0, h: 1 })).toBe(false);
    expect(isValidRect({ x: -1, y: 0, w: 1, h: 1 })).toBe(false);
    expect(isValidRect({ x: 0.5, y: 0, w: 1, h: 1 })).toBe(false);
  });
});

describe("overlaps / isFree", () => {
  const a = { x: 0, y: 0, w: 5, h: 5 };
  it("detects overlap and adjacency-no-overlap", () => {
    expect(overlaps(a, { x: 4, y: 4, w: 2, h: 2 })).toBe(true);
    expect(overlaps(a, { x: 5, y: 0, w: 2, h: 2 })).toBe(false); // touching edge, not overlapping
  });
  it("isFree is false when any taken rect overlaps", () => {
    expect(isFree({ x: 2, y: 2, w: 2, h: 2 }, [a])).toBe(false);
    expect(isFree({ x: 6, y: 6, w: 2, h: 2 }, [a])).toBe(true);
  });
});
