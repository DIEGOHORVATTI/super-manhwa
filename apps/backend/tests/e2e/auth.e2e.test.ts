import { describe, expect, it } from "bun:test";

import { apiClient } from "../helpers/api-client";

describe("auth / X-API-KEY guard", () => {
  const PROTECTED_PATHS = [
    "/api/manga/langs",
    "/api/manga/popular",
    "/api/manga/genres",
    "/api/manga/suggest?q=test",
    "/api/img/anything",
  ];

  it.each(PROTECTED_PATHS)("rejects %s without the API key", async (path) => {
    const res = await apiClient.rawGet(path);
    expect(res.status).toBe(401);
  });

  it.each(PROTECTED_PATHS)("rejects %s with a wrong API key", async (path) => {
    const res = await apiClient.rawGet(path, { headers: { "X-API-KEY": "wrong-key-xyz" } });
    expect(res.status).toBe(401);
  });

  it("/api/health stays open without the key (Docker probe path)", async () => {
    const res = await apiClient.rawGet("/api/health");
    expect(res.status).toBe(200);
  });

  it("authorized requests succeed", async () => {
    const langs = await apiClient.manga.langs();
    expect(Array.isArray(langs.langs)).toBe(true);
    expect(langs.langs.length).toBeGreaterThan(0);
  });
});
