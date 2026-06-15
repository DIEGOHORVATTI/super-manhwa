import { describe, expect, it } from "bun:test";

import { PREMIUM_PRICE_BRL, PREMIUM_PRICE_CENTS } from "../lib/learn-pricing";

describe("learn pricing", () => {
  it("cents is the BRL price × 100, rounded", () => {
    expect(PREMIUM_PRICE_CENTS).toBe(Math.round(PREMIUM_PRICE_BRL * 100));
  });
  it("defaults to a sane positive price", () => {
    expect(PREMIUM_PRICE_BRL).toBeGreaterThan(0);
    expect(PREMIUM_PRICE_CENTS).toBeGreaterThan(0);
  });
});
