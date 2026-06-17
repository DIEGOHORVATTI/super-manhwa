import { describe, expect, it } from "bun:test";

import type { MangaConnector, RawDetail, RawListPage } from "@packages/extension";
import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";
import type { CatalogSource } from "@/modules/catalog/domain/catalog-source";
import { makeListLatest } from "@/modules/catalog/application/list-latest";
import type { ConnectorRegistry } from "@/modules/catalog/infrastructure/connector-registry";

const idStore: IdStore = {
  encode: ({ source, url }) => `${source}::${url}`,
  decode: () => null,
};
const cache: Cache = { remember: (_k, _ttl, fn) => fn(), set: () => {}, get: () => undefined };

/** Fake AniList catalog: only the given titles match (→ their numeric id). */
const catalogOf = (matches: Record<string, string> = {}): CatalogSource => ({
  search: async (q) => {
    const id = matches[q.toLowerCase()];
    return { items: id ? [{ id, title: q }] : [], hasNextPage: false };
  },
  list: async () => ({ items: [], hasNextPage: false }),
  byId: async () => null,
  genres: async () => [],
});

const conn = (id: string, lang: string, latest?: () => Promise<RawListPage>): MangaConnector => ({
  id,
  name: id,
  langs: [lang],
  baseUrl: "https://x",
  iconUrl: "https://x/i",
  hasCloudflare: false,
  isNsfw: false,
  getPopular: async (): Promise<RawListPage> => ({ list: [] }),
  search: async (): Promise<RawListPage> => ({ list: [] }),
  getDetail: async (): Promise<RawDetail> => ({ chapters: [] }),
  getPageList: async () => [],
  ...(latest ? { getLatestUpdates: latest } : {}),
});

const page = (...names: string[]): RawListPage => ({
  list: names.map((n) => ({ name: n, link: `/m/${n}` })),
});

const registryOf = (connectors: MangaConnector[]): ConnectorRegistry => ({
  listCurated: () => connectors,
  resolve: async (id) => connectors.find((c) => c.id === id),
});

describe("makeListLatest", () => {
  it("prefers pt-br, round-robin interleaves, dedupes by title, skips unsupported", async () => {
    const ptbr = conn("a-ptbr", "pt-br", async () => page("Naruto", "Bleach"));
    const en = conn("b-en", "en", async () => page("Bleach", "One Piece"));
    const noLatest = conn("c-en", "en"); // no getLatestUpdates → filtered out

    const catalog = catalogOf({ naruto: "30002", bleach: "30003" }); // one piece unmatched
    const res = await makeListLatest(
      registryOf([en, ptbr, noLatest]),
      catalog,
      idStore,
      cache,
    )({ page: 1 });

    expect(res.list.map((m) => m.name)).toEqual(["Naruto", "Bleach", "One Piece"]);
    expect(res.list[0].lang).toBe("pt-br"); // connector language flag is preserved
    expect(res.list[0].id).toBe("30002"); // matched → canonical AniList id
    expect(res.list[2].id).toBe("b-en::/m/One Piece"); // unmatched → opaque connector id
  });

  it("tolerates a throwing connector (skips its batch)", async () => {
    const ok = conn("ok", "pt-br", async () => page("A", "B"));
    const boom = conn("boom", "pt-br", async () => {
      throw new Error("down");
    });
    const res = await makeListLatest(
      registryOf([ok, boom]),
      catalogOf(),
      idStore,
      cache,
    )({ page: 1 });
    expect(res.list.map((m) => m.name)).toEqual(["A", "B"]);
  });

  it("returns empty when no connector supports latest", async () => {
    const res = await makeListLatest(
      registryOf([conn("x", "en")]),
      catalogOf(),
      idStore,
      cache,
    )({ page: 1 });
    expect(res.list).toEqual([]);
    expect(res.hasNextPage).toBe(false);
  });
});
