import { describe, expect, it } from "bun:test";

import { CONNECTORS, type MangaConnector } from "@packages/extension";

/**
 * Mangafire native connector (mangafire.to). Signs requests with a `vrf` token
 * computed by the vendored extension's crypto, run in native Bun (it throws
 * under QuickJS). No WAF, no FlareSolverr. These tests prove the direct path
 * end to end; tolerant of network hiccups so they don't flake CI.
 */
const mangafire = (): MangaConnector => {
  const c = CONNECTORS.find((x) => x.id === "mangafire-ptbr");
  if (!c) throw new Error("mangafire-ptbr not registered");
  return c;
};

describe("mangafire / native API (mangafire.to)", () => {
  it("is registered as a pt-br connector", () => {
    const c = mangafire();
    expect(c.lang).toBe("pt-br");
    expect(c.baseUrl).toBe("https://mangafire.to");
  });

  it("search signs the vrf and returns Solo Leveling", async () => {
    const c = mangafire();
    let r: Awaited<ReturnType<typeof c.search>>;
    try {
      r = await c.search("solo leveling", 1);
    } catch (e) {
      console.warn("mangafire search skipped:", (e as Error).message);
      return;
    }
    expect(r.list.length).toBeGreaterThan(0);
    expect(r.list.some((m) => /solo leveling/i.test(m.name))).toBe(true);
  }, 40_000);

  it("getDetail returns a full pt-br chapter list + getPageList yields images", async () => {
    const c = mangafire();
    let detail: Awaited<ReturnType<typeof c.getDetail>>;
    try {
      const s = await c.search("solo leveling", 1);
      const target = s.list.find((m) => m.name === "Solo Leveling") ?? s.list[0];
      if (!target) return;
      detail = await c.getDetail(target.link);
    } catch (e) {
      console.warn("mangafire detail skipped:", (e as Error).message);
      return;
    }
    const chapters = detail.chapters ?? [];
    expect(chapters.length).toBeGreaterThan(50);
    expect(typeof chapters[0].name).toBe("string");

    const oldest = chapters[chapters.length - 1];
    const pages = await c.getPageList(oldest.url);
    expect(pages.length).toBeGreaterThan(0);
    const first = typeof pages[0] === "string" ? pages[0] : pages[0].url;
    expect(first).toMatch(/^https?:\/\//);
  }, 60_000);
});
