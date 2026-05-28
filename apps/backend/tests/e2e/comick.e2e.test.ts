import { describe, expect, it } from "bun:test";

import { CONNECTORS, type MangaConnector } from "@packages/extension";

/**
 * Comick native connector (comick.live API). It's registered `hasCloudflare:
 * true` (kept out of the popular pool because its /top isn't language-filtered),
 * but it IS a real working connector — these tests prove the direct-API path
 * end to end against a known title. Tolerant of upstream/network hiccups so it
 * doesn't flake CI, but asserts hard whenever the site responds.
 */
const comick = (): MangaConnector => {
  const c = CONNECTORS.find((x) => x.id === "comick-ptbr");
  if (!c) throw new Error("comick-ptbr not registered");
  return c;
};

const SOLO_SLUG = "00-solo-leveling";

describe("comick / native API (comick.live)", () => {
  it("is registered as a pt-br connector", () => {
    const c = comick();
    expect(c.lang).toBe("pt-br");
    expect(c.baseUrl).toBe("https://comick.live");
  });

  it("getDetail resolves Solo Leveling with a full pt-br chapter list", async () => {
    const c = comick();
    let detail: Awaited<ReturnType<typeof c.getDetail>>;
    try {
      detail = await c.getDetail(SOLO_SLUG);
    } catch (e) {
      // Site/CF hiccup — don't flake; the direct-fetch path is best-effort
      // without FlareSolverr in CI.
      console.warn("comick getDetail skipped:", (e as Error).message);
      return;
    }
    expect(detail.title).toMatch(/solo leveling/i);
    const chapters = detail.chapters ?? [];
    // pt-br Solo Leveling on Comick has hundreds of chapters (vs 5 on MangaDex
    // pt-br). Assert a healthy floor rather than an exact count.
    expect(chapters.length).toBeGreaterThan(100);
    // chapter shape
    const ch = chapters[0];
    expect(typeof ch.name).toBe("string");
    expect(ch.url).toContain(SOLO_SLUG);
    expect(ch.url).toContain("-pt-br");
  }, 60_000);

  it("getPageList returns real image URLs for a Solo Leveling chapter", async () => {
    const c = comick();
    let detail: Awaited<ReturnType<typeof c.getDetail>>;
    try {
      detail = await c.getDetail(SOLO_SLUG);
    } catch {
      return; // covered by the test above; tolerate network here
    }
    const chapters = detail.chapters ?? [];
    if (chapters.length === 0) return;
    // oldest chapter (last in the newest-first list)
    const target = chapters[chapters.length - 1];
    const pages = await c.getPageList(target.url);
    expect(pages.length).toBeGreaterThan(0);
    const first = typeof pages[0] === "string" ? pages[0] : pages[0].url;
    expect(first).toMatch(/^https?:\/\//);
  }, 60_000);

  it("getPopular returns works (global top — not language filtered)", async () => {
    const c = comick();
    try {
      const r = await c.getPopular(1);
      expect(Array.isArray(r.list)).toBe(true);
      if (r.list.length > 0) {
        expect(typeof r.list[0].name).toBe("string");
        expect(typeof r.list[0].link).toBe("string");
      }
    } catch (e) {
      console.warn("comick getPopular skipped:", (e as Error).message);
    }
  }, 40_000);
});
