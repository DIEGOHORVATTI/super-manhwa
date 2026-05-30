import { describe, expect, it } from "bun:test";

import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";
import { makeGetMangaCore } from "@/modules/catalog/application/get-manga-core";
import type { CatalogSource, CatalogWork } from "@/modules/catalog/domain/catalog-source";

const idStore: IdStore = {
  encode: ({ source, url }) => `${source}::${url}`,
  decode: (id) => {
    const i = id.indexOf("::");
    return i === -1 ? null : { source: id.slice(0, i), url: id.slice(i + 2) };
  },
};

const cache: Cache = { remember: (_k, _ttl, fn) => fn(), set: () => {}, get: () => undefined };

const catalogOf = (work: CatalogWork | null): CatalogSource => ({
  search: async () => ({ items: [], hasNextPage: false }),
  list: async () => ({ items: [], hasNextPage: false }),
  genres: async () => [],
  byId: async () => work,
});

const work = (over: Partial<CatalogWork> & { id: string; title: string }): CatalogWork => ({
  aliases: [],
  ...over,
});

describe("getMangaCore (AniList metadata, no chapters)", () => {
  it("shapes title/genres and proxies the cover through /api/img", async () => {
    const get = makeGetMangaCore(
      catalogOf(
        work({
          id: "123",
          title: "Solo Leveling",
          imageUrl: "https://s4.anilist.co/x.jpg",
          genres: ["Action"],
        }),
      ),
      idStore,
      cache,
    );

    const { core, lang } = await get({ id: "123" });
    expect(lang).toBe("pt-br");
    expect(core.title).toBe("Solo Leveling");
    expect(core.genre).toEqual(["Action"]);
    expect(core.imageUrl).toContain("/api/img/");
  });

  it("falls back to the name hint when the catalog has no entry", async () => {
    const get = makeGetMangaCore(catalogOf(null), idStore, cache);
    const { core } = await get({ id: "nope", name: "Some Work" });
    expect(core.title).toBe("Some Work");
    expect(core.imageUrl).toBeUndefined();
  });

  it("404s when the id is unknown and there's no name hint", async () => {
    const get = makeGetMangaCore(catalogOf(null), idStore, cache);
    expect(get({ id: "nope" })).rejects.toThrow();
  });
});
