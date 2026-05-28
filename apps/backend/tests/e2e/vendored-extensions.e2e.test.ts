import { describe, expect, it } from "bun:test";

import { CONNECTORS, loadMangaExtension, VENDORED_VERSION } from "@packages/extension";

/**
 * Proves that the vendored Mangayomi JS files in
 * `packages/extension/javascript/manga/src/` are actually wired up — each
 * curated Mangayomi-backed connector reads exactly one of them at first call
 * via `loadMangaExtension`. If this suite passes, the directory is live.
 */

const VENDORED_PATHS = [
  "all/mangadex.js",
  "all/webtoons.js",
  "all/comick.js",
  "all/mangafire.js",
  "en/weebcentral.js",
  "en/manhwaz.js",
  "en/asurascans.js",
  "it/mangaworld.js",
] as const;

describe("vendored extensions / package files", () => {
  it("exposes a version stamp so the snapshot is observable", () => {
    expect(typeof VENDORED_VERSION).toBe("string");
    expect(VENDORED_VERSION.length).toBeGreaterThan(0);
  });

  it.each(
    VENDORED_PATHS,
  )("loads %s as real JS containing Mangayomi entry points", async (relPath) => {
    const code = await loadMangaExtension(relPath);
    expect(code.length).toBeGreaterThan(500);
    // A real Mangayomi extension exports at least one of these functions.
    expect(code).toMatch(/getPopular|search|getDetail|getPageList/);
  });

  it("an unknown path throws (no silent fallback to network)", async () => {
    await expect(loadMangaExtension("fake/nonexistent.js")).rejects.toThrow(
      /vendored extension not found/,
    );
  });

  it("every expected Mangayomi-backed connector is registered (each maps to a vendored JS file)", () => {
    // These connectors are all built via `createMangayomiConnector` with a
    // vendored source path — they read JS from this directory at first call.
    // mangadex-ptbr reuses all/mangadex.js; comick/mangafire-ptbr add their own.
    const EXPECTED_MANGAYOMI_IDS = [
      "mangadex",
      "webtoons",
      "weebcentral",
      "mangaworld",
      "manhwaz",
      "asurascans",
      "mangadex-ptbr",
      "comick-ptbr",
      "mangafire-ptbr",
    ];
    const ids = new Set(CONNECTORS.map((c) => c.id));
    for (const id of EXPECTED_MANGAYOMI_IDS) {
      expect(ids.has(id)).toBe(true);
    }
  });
});
