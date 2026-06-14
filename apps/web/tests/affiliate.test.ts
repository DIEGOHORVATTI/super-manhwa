import { describe, expect, it } from "bun:test";

import {
  codeFromBytes,
  commissionCents,
  isValidCode,
  normalizeCode,
  periodKey,
} from "../lib/affiliate";

describe("commissionCents", () => {
  it("computes 20% by default, rounded", () => {
    expect(commissionCents(1490)).toBe(298); // R$14.90 → R$2.98
    expect(commissionCents(1000, 20)).toBe(200);
  });
  it("honors a custom rate and never goes negative", () => {
    expect(commissionCents(1000, 30)).toBe(300);
    expect(commissionCents(-100)).toBe(0);
  });
});

describe("isValidCode / normalizeCode", () => {
  it("accepts 6–12 lowercase alphanumerics", () => {
    expect(isValidCode("abc123")).toBe(true);
    expect(isValidCode("abcd")).toBe(false); // too short
    expect(isValidCode("ABC123")).toBe(false); // uppercase
    expect(isValidCode("abc-123")).toBe(false);
  });
  it("normalizes by lowercasing/trimming and validating", () => {
    expect(normalizeCode("  ABC123 ")).toBe("abc123");
    expect(normalizeCode("nope!")).toBeNull();
    expect(normalizeCode(null)).toBeNull();
  });
});

describe("periodKey", () => {
  it("is the UTC YYYY-MM", () => {
    expect(periodKey(new Date("2026-06-14T10:00:00Z"))).toBe("2026-06");
  });
});

describe("codeFromBytes", () => {
  it("is deterministic for the same bytes and right length", () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const a = codeFromBytes(bytes);
    expect(a).toBe(codeFromBytes(bytes));
    expect(a).toHaveLength(8);
    expect(isValidCode(a)).toBe(true);
  });
});
