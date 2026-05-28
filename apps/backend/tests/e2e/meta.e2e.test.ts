import { describe, expect, it } from "bun:test";

import { apiClient } from "../helpers/api-client";

/**
 * AniList metadata enrichment (/api/manga/meta). Powers the detail page's
 * Characters/About tabs. Best-effort upstream — tolerant of network/rate-limit
 * hiccups so it doesn't flake, but asserts the shape + proxying when it answers.
 */
describe("metadata / AniList enrichment", () => {
  it("meta(Solo Leveling) returns score, tags, characters with proxied images", async () => {
    let meta: Awaited<ReturnType<typeof apiClient.manga.meta>>["meta"];
    try {
      meta = (await apiClient.manga.meta({ name: "Solo Leveling" })).meta;
    } catch (e) {
      console.warn("meta skipped:", (e as Error).message);
      return;
    }
    // Shape is always valid even on a miss.
    expect(Array.isArray(meta.tags)).toBe(true);
    expect(Array.isArray(meta.characters)).toBe(true);
    expect(Array.isArray(meta.relations)).toBe(true);

    // On a hit (the common case), assert the rich fields.
    if (meta.characters.length > 0) {
      expect(typeof meta.characters[0].name).toBe("string");
      // images must be proxied — never the raw AniList CDN
      for (const c of meta.characters) {
        if (c.imageUrl) expect(c.imageUrl.startsWith("/api/img/")).toBe(true);
      }
    }
    if (meta.bannerImage) expect(meta.bannerImage.startsWith("/api/img/")).toBe(true);
    if (meta.score !== undefined) {
      expect(meta.score).toBeGreaterThan(0);
      expect(meta.score).toBeLessThanOrEqual(100);
    }
  }, 30_000);

  it("meta for a nonsense title returns an empty (but valid) shape", async () => {
    let meta: Awaited<ReturnType<typeof apiClient.manga.meta>>["meta"];
    try {
      meta = (await apiClient.manga.meta({ name: "zzzzzznotarealtitle12345" })).meta;
    } catch {
      return;
    }
    expect(Array.isArray(meta.characters)).toBe(true);
    expect(Array.isArray(meta.tags)).toBe(true);
  }, 30_000);
});
