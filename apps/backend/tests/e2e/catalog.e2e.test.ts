import { describe, expect, it } from "bun:test";

import { apiClient } from "../helpers/api-client";

describe("catalog / aggregation", () => {
  it("popular returns a deduped, source-less list", async () => {
    const r = await apiClient.manga.popular();
    // AniList catalog returns one page (30/page); more pages via hasNextPage.
    expect(r.list.length).toBeGreaterThanOrEqual(20);
    expect(r.hasNextPage).toBe(true);
    // Wire is source-agnostic — no leak of source fields anywhere.
    for (const m of r.list.slice(0, 10)) {
      expect(typeof m.id).toBe("string");
      expect(m.id.length).toBeGreaterThan(0); // opaque catalog id (AniList id string)
      expect(typeof m.name).toBe("string");
      expect(typeof m.lang).toBe("string");
      // No source name should leak via any field, ever.
      expect(JSON.stringify(m)).not.toMatch(/mangadex|webtoons|manhwaz|mangaworld|weebcentral/i);
    }
    // No duplicate names (case-insensitive).
    const names = new Set(r.list.map((m) => m.name.trim().toLowerCase()));
    expect(names.size).toBe(r.list.length);
  }, 30_000);

  it("popular with sort=newest triggers enrichment (status + genres populated)", async () => {
    const r = await apiClient.manga.popular({ sort: "newest" });
    const enriched = r.list.filter((m) => m.status !== undefined || m.genres !== undefined);
    expect(enriched.length).toBeGreaterThan(5);
  }, 60_000);

  it("popular with sort=completed only returns finished works", async () => {
    const r = await apiClient.manga.popular({ sort: "completed" });
    for (const m of r.list) {
      expect(["completed", "publishing-finished"]).toContain(m.status);
    }
  }, 60_000);

  it("popular filtered by genre returns only matching works", async () => {
    const r = await apiClient.manga.popular({ genre: "action" });
    // Some result expected (Action is common); each must have genres including action.
    expect(r.list.length).toBeGreaterThan(0);
    for (const m of r.list) {
      const has = (m.genres ?? []).some((g) => g.toLowerCase().includes("action"));
      expect(has).toBe(true);
    }
  }, 60_000);

  it("search finds an iconic title across sources", async () => {
    const r = await apiClient.manga.search({ q: "One Piece" });
    expect(r.list.length).toBeGreaterThan(0);
    expect(r.list.some((m) => /one piece/i.test(m.name))).toBe(true);
  });

  it("suggest is fast and capped at ~10", async () => {
    const start = performance.now();
    const r = await apiClient.manga.suggest({ q: "eminence" });
    const ms = performance.now() - start;
    expect(r.list.length).toBeGreaterThanOrEqual(1);
    expect(r.list.length).toBeLessThanOrEqual(10);
    expect(ms).toBeLessThan(12_000); // tight bound, single-source fast path
  });

  it("langs reports at least 'en'", async () => {
    const r = await apiClient.manga.langs();
    expect(r.langs).toContain("en");
  });

  it("genres returns a non-empty list including Action", async () => {
    const r = await apiClient.manga.genres();
    expect(r.genres.length).toBeGreaterThan(5);
    expect(r.genres.some((g) => g.toLowerCase() === "action")).toBe(true);
  });
});

describe("catalog / detail + pages flow", () => {
  // Two distinct titles exercise two distinct paths through the fallback logic:
  // - "Solo Leveling": MangaDex DMCA-blocks chapters → cross-source fallback recovers
  // - "Eminence in Shadow" (or first popular): primary source returns chapters directly
  const pickTitles = (popular: { name: string; id: string }[]) => {
    const soloLeveling = popular.find((m) => m.name === "Solo Leveling");
    const eminence = popular.find((m) => /eminence/i.test(m.name));
    const picks = [soloLeveling, eminence, popular[0], popular[1]].filter(Boolean) as Array<{
      name: string;
      id: string;
    }>;
    // Dedupe by id, keep first two.
    const seen = new Set<string>();
    return picks.filter((p) => (seen.has(p.id) ? false : seen.add(p.id))).slice(0, 2);
  };

  it("detail returns chapters for TWO different popular titles (fallback works when primary fails)", async () => {
    const popular = await apiClient.manga.popular();
    const targets = pickTitles(popular.list);
    expect(targets.length).toBe(2);

    for (const target of targets) {
      const r = await apiClient.manga.detail({ id: target.id, name: target.name });
      const chapters = r.detail.chapters ?? [];
      expect(chapters.length).toBeGreaterThan(0);
      // Chapter shape sanity — id is an opaque AES-GCM token (long base64url),
      // name a string.
      for (const c of chapters.slice(0, 3)) {
        expect(typeof c.id).toBe("string");
        expect(c.id.length).toBeGreaterThan(0);
        expect(typeof c.name).toBe("string");
      }
    }
  }, 120_000);

  it("pages from TWO different chapters return opaque /api/img/<token> paths (and the bytes are real images)", async () => {
    const popular = await apiClient.manga.popular();
    const targets = pickTitles(popular.list);
    expect(targets.length).toBe(2);

    for (const target of targets) {
      const detail = await apiClient.manga.detail({ id: target.id, name: target.name });
      const firstChapter = (detail.detail.chapters ?? [])[0];
      expect(firstChapter).toBeDefined();

      const pages = await apiClient.manga.pages(firstChapter.id);
      expect(pages.pages.length).toBeGreaterThan(0);
      for (const p of pages.pages) {
        expect(p.startsWith("/api/img/")).toBe(true);
      }

      // Fetch first page bytes — confirms end-to-end that the proxy works
      // for chapter pages on both kinds of titles (direct + fallback).
      const token = pages.pages[0].split("/").pop()!;
      const imgRes = await apiClient.image(token);
      expect(imgRes.status).toBe(200);
      expect(imgRes.headers.get("content-type")).toMatch(/^image\//);
      const buf = new Uint8Array(await imgRes.arrayBuffer());
      expect(buf.byteLength).toBeGreaterThan(1000);
    }
  }, 180_000);

  it("invalid manga id is rejected as not-found", async () => {
    // Manga ids are AniList lookups (not opaque tokens), so an unresolvable id is
    // a 404 (unknown work) — distinct from a malformed *chapter* token (400 below).
    const res = await apiClient.rawGet("/api/manga/detail?id=not-a-real-id", {
      headers: { "X-API-KEY": apiClient.apiKey },
    });
    expect(res.status).toBe(404);
  });

  it("invalid chapter id is rejected with 400", async () => {
    const res = await apiClient.rawGet("/api/manga/pages?id=not-a-real-id", {
      headers: { "X-API-KEY": apiClient.apiKey },
    });
    expect(res.status).toBe(400);
  });
});
