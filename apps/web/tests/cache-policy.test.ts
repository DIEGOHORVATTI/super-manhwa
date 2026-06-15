import { describe, expect, it } from "bun:test";

import { FRESH_MS, isAbsolute, isStale } from "../lib/cache-policy";

describe("isAbsolute", () => {
  it("accepts http and https URLs", () => {
    expect(isAbsolute("http://x/y.jpg")).toBe(true);
    expect(isAbsolute("https://x/y.jpg")).toBe(true);
    expect(isAbsolute("HTTPS://X")).toBe(true);
  });

  it("rejects relative paths, proxy paths and empty values", () => {
    expect(isAbsolute("/api/img/abc")).toBe(false);
    expect(isAbsolute("works/1/cover.jpg")).toBe(false);
    expect(isAbsolute("")).toBe(false);
    expect(isAbsolute(null)).toBe(false);
    expect(isAbsolute(undefined)).toBe(false);
  });
});

describe("isStale", () => {
  const now = 1_000_000_000_000;
  it("is fresh just under the window", () => {
    expect(isStale(now - (FRESH_MS - 1), now)).toBe(false);
  });
  it("is stale at/after the window", () => {
    expect(isStale(now - FRESH_MS, now)).toBe(true);
    expect(isStale(now - FRESH_MS * 2, now)).toBe(true);
  });
  it("accepts Date and ISO inputs", () => {
    expect(isStale(new Date(now - FRESH_MS - 1), now)).toBe(true);
    expect(isStale(new Date(now).toISOString(), now)).toBe(false);
  });
});
