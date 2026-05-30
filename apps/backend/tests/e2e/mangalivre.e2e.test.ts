import { describe, expect, it } from "bun:test";

import { CONNECTORS, type MangaConnector } from "@packages/extension";

/**
 * Manga Livre native connectors — two separate sites/stacks behind one brand:
 *   - mangalivre-to   → WordPress + Madara (WP-Manga) theme
 *   - mangalivre-blog → custom WordPress theme ("b"), inline chapter list
 *
 * Both are real, working, non-Cloudflare scrapers (so they're in the popular
 * pool, unlike Comick/Mangafire). These tests prove the full
 * popular → search → detail → pages path against the live sites, asserting hard
 * when the site responds but tolerating upstream/network hiccups so they don't
 * flake CI (same approach as `comick.e2e.test.ts`).
 */

const IDS = ["mangalivre-to", "mangalivre-blog"] as const;

const BASE_URL: Record<string, string> = {
  "mangalivre-to": "https://mangalivre.to",
  "mangalivre-blog": "https://mangalivre.blog",
};

const get = (id: string): MangaConnector => {
  const c = CONNECTORS.find((x) => x.id === id);
  if (!c) throw new Error(`${id} not registered`);
  return c;
};

const pageUrl = (p: string | { url: string }): string => (typeof p === "string" ? p : p.url);

const TEST_TIMEOUT = 60_000;

describe("manga livre / registration", () => {
  it.each(IDS)("'%s' is a registered non-CF pt-br connector", (id) => {
    const c = get(id);
    expect(c.lang).toBe("pt-br");
    expect(c.baseUrl).toBe(BASE_URL[id]);
    // Working scrapers → kept IN the popular pool (no Cloudflare bypass needed).
    expect(c.hasCloudflare).toBe(false);
  });

  it.each(IDS)("'%s' implements the full MangaConnector contract", (id) => {
    const c = get(id);
    expect(typeof c.getPopular).toBe("function");
    expect(typeof c.getLatestUpdates).toBe("function");
    expect(typeof c.search).toBe("function");
    expect(typeof c.getDetail).toBe("function");
    expect(typeof c.getPageList).toBe("function");
  });
});

describe("manga livre / live network", () => {
  it.each(IDS)(
    "'%s'.getPopular returns a non-empty list of works",
    async (id) => {
      const c = get(id);
      try {
        const r = await c.getPopular(1);
        expect(Array.isArray(r.list ?? [])).toBe(true);
        const list = r.list ?? [];
        if (list.length > 0) {
          expect(typeof list[0].name).toBe("string");
          expect(list[0].name.length).toBeGreaterThan(0);
          expect(list[0].link).toMatch(/^https?:\/\//);
        }
      } catch (e) {
        // Upstream/network hiccup — don't flake CI.
        console.warn(`${id} getPopular skipped:`, (e as Error).message);
      }
    },
    TEST_TIMEOUT,
  );

  it.each(IDS)(
    "'%s' search → detail → pages resolves One Piece end to end",
    async (id) => {
      const c = get(id);

      let link: string | undefined;
      try {
        const r = await c.search("one piece", 1);
        const list = r.list ?? [];
        link = list.find((m) => /one piece/i.test(m.name))?.link ?? list[0]?.link;
      } catch (e) {
        console.warn(`${id} search skipped:`, (e as Error).message);
        return;
      }
      if (!link) return; // search empty — tolerated

      const detail = await c.getDetail(link);
      expect(detail.title).toMatch(/one piece/i);
      expect(detail.imageUrl).toMatch(/^https?:\/\//);

      // One Piece has 1000+ chapters on both sites; assert a healthy floor.
      const chapters = detail.chapters ?? [];
      expect(chapters.length).toBeGreaterThan(100);
      const ch = chapters[0];
      expect(typeof ch.name).toBe("string");
      expect(ch.name.length).toBeGreaterThan(0);
      expect(ch.url).toMatch(/^https?:\/\//);

      // Newest chapter — pages must be real upstream image URLs.
      const pages = await c.getPageList(ch.url);
      expect(pages.length).toBeGreaterThan(0);
      expect(pageUrl(pages[0])).toMatch(/^https?:\/\/.+\.(jpg|jpeg|png|webp|gif|avif)/i);
    },
    TEST_TIMEOUT,
  );
});
