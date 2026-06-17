import { describe, expect, it } from "bun:test";

import { FRESH_MS, isAbsolute, isStale, workCacheUpToDate } from "../lib/cache-policy";

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

describe("workCacheUpToDate", () => {
  const now = 1_000_000_000_000;
  const fresh = now - 1000;
  const stale = now - FRESH_MS;
  const banner = "https://cdn/banner.jpg";

  it("is false when nothing is cached", () => {
    expect(workCacheUpToDate(undefined, banner, now)).toBe(false);
  });
  it("is false when the row is stale (forces daily refresh)", () => {
    expect(
      workCacheUpToDate({ coverR2Key: "c", bannerR2Key: "b", refreshedAt: stale }, banner, now),
    ).toBe(false);
  });
  it("is false when fresh but the cover isn't mirrored yet", () => {
    expect(
      workCacheUpToDate({ coverR2Key: null, bannerR2Key: "b", refreshedAt: fresh }, banner, now),
    ).toBe(false);
  });
  it("is false when fresh, cover done, but an absolute banner is still unmirrored", () => {
    expect(
      workCacheUpToDate({ coverR2Key: "c", bannerR2Key: null, refreshedAt: fresh }, banner, now),
    ).toBe(false);
  });
  it("is true when fresh + both mirrored", () => {
    expect(
      workCacheUpToDate({ coverR2Key: "c", bannerR2Key: "b", refreshedAt: fresh }, banner, now),
    ).toBe(true);
  });
  it("is true when fresh + cover done and there's no banner to mirror", () => {
    expect(
      workCacheUpToDate({ coverR2Key: "c", bannerR2Key: null, refreshedAt: fresh }, null, now),
    ).toBe(true);
  });
});
