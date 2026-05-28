import { describe, expect, it } from "bun:test";

import { apiClient } from "../helpers/api-client";

describe("catalog / aggregation", () => {
  it("popular returns a deduped, source-less list", async () => {
    const r = await apiClient.manga.popular();
    expect(r.list.length).toBeGreaterThan(30);
    // Wire is source-agnostic — no leak of source fields anywhere.
    for (const m of r.list.slice(0, 10)) {
      expect(typeof m.id).toBe("string");
      expect(m.id.length).toBeLessThan(20); // short ids ~7 chars
      expect(typeof m.name).toBe("string");
      expect(typeof m.lang).toBe("string");
      // No source name should leak via any field, ever.
      expect(JSON.stringify(m)).not.toMatch(/mangadex|webtoons|manhwaz|mangaworld|weebcentral/i);
    }
    // No duplicate names (case-insensitive).
    const names = new Set(r.list.map((m) => m.name.trim().toLowerCase()));
    expect(names.size).toBe(r.list.length);
  });

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
  it("detail returns chapters for a popular title (with cross-source fallback when needed)", async () => {
    const popular = await apiClient.manga.popular();
    // Pick "Solo Leveling" — MangaDex has it but DMCA-blocked; fallback must recover.
    const target =
      popular.list.find((m) => m.name === "Solo Leveling") ??
      popular.list.find((m) => /eminence/i.test(m.name)) ??
      popular.list[0];
    const r = await apiClient.manga.detail({ id: target.id, name: target.name });
    expect(r.detail.chapters).toBeDefined();
    expect((r.detail.chapters ?? []).length).toBeGreaterThan(0);
  });

  it("pages returns opaque /api/img/<token> paths only — no upstream CDN URLs leak", async () => {
    const popular = await apiClient.manga.popular();
    const target = popular.list.find((m) => /eminence/i.test(m.name)) ?? popular.list[0];
    const detail = await apiClient.manga.detail({ id: target.id, name: target.name });
    const firstChapter = (detail.detail.chapters ?? [])[0];
    expect(firstChapter).toBeDefined();
    const pages = await apiClient.manga.pages(firstChapter.id);
    expect(pages.pages.length).toBeGreaterThan(0);
    for (const p of pages.pages) {
      expect(p.startsWith("/api/img/")).toBe(true);
    }
  });

  it("invalid manga id is rejected with 400", async () => {
    const res = await apiClient.rawGet("/api/manga/detail?id=not-a-real-id", {
      headers: { "X-API-KEY": apiClient.apiKey },
    });
    expect(res.status).toBe(400);
  });
});
