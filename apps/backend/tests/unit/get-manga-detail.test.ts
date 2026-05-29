import { describe, expect, it } from "bun:test";

import type { MangaConnector, RawDetail, RawListPage } from "@packages/extension";
import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";
import { makeGetMangaDetail } from "@/modules/catalog/application/get-manga-detail";
import type { CatalogSource, CatalogWork } from "@/modules/catalog/domain/catalog-source";
import type { ConnectorRegistry } from "@/modules/catalog/infrastructure/connector-registry";

// --- fakes -----------------------------------------------------------------

const idStore: IdStore = {
  encode: ({ source, url }) => `${source}::${url}`,
  decode: (id) => {
    const i = id.indexOf("::");
    return i === -1 ? null : { source: id.slice(0, i), url: id.slice(i + 2) };
  },
};

const cache: Cache = { remember: (_k, _ttl, fn) => fn(), set: () => {}, get: () => undefined };

const chaps = (...nums: number[]) => nums.map((n) => ({ name: `Ch.${n}`, url: `/c/${n}` }));

const makeConnector = (
  over: Partial<MangaConnector> & { id: string; lang: string },
): MangaConnector => ({
  name: over.id,
  baseUrl: "https://x",
  iconUrl: "https://x/i",
  hasCloudflare: false,
  isNsfw: false,
  getPopular: async (): Promise<RawListPage> => ({ list: [], hasNextPage: false }),
  search: async (): Promise<RawListPage> => ({ list: [], hasNextPage: false }),
  getDetail: async (): Promise<RawDetail> => ({ chapters: [] }),
  getPageList: async () => [],
  ...over,
});

const registryOf = (connectors: MangaConnector[]): ConnectorRegistry => ({
  listCurated: () => connectors,
  resolve: async (id) => connectors.find((c) => c.id === id),
});

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

// --- tests -----------------------------------------------------------------

describe("getMangaDetail (AniList identity + connector chapter merge)", () => {
  it("unions chapters across pt-br sources, preferring the deepest one", async () => {
    const comick = makeConnector({
      id: "comick-ptbr",
      lang: "pt-br",
      search: async (q) =>
        /solo/i.test(q)
          ? { list: [{ name: "Solo Leveling", link: "/c/sl" }], hasNextPage: false }
          : { list: [], hasNextPage: false },
      getDetail: async () => ({ chapters: chaps(5, 4, 3, 2, 1) }),
    });
    const mangadexPtbr = makeConnector({
      id: "mangadex-ptbr",
      lang: "pt-br",
      search: async () => ({
        list: [{ name: "Solo Leveling", link: "/m/sl" }],
        hasNextPage: false,
      }),
      getDetail: async () => ({ chapters: chaps(2, 1) }),
    });

    const get = makeGetMangaDetail(
      catalogOf(
        work({
          id: "123",
          title: "Solo Leveling",
          imageUrl: "https://s4.anilist.co/x.jpg",
          genres: ["Action"],
        }),
      ),
      registryOf([comick, mangadexPtbr]),
      idStore,
      cache,
    );

    const { detail, lang } = await get({ id: "123" });
    expect(lang).toBe("pt-br");
    expect(detail.title).toBe("Solo Leveling");
    expect(detail.genre).toEqual(["Action"]);
    expect(detail.imageUrl).toContain("/api/img/");
    expect((detail.chapters ?? []).map((c) => c.name)).toEqual([
      "Ch.5",
      "Ch.4",
      "Ch.3",
      "Ch.2",
      "Ch.1",
    ]);
    expect(detail.chapters?.every((c) => c.lang === "pt-br")).toBe(true);
    expect(detail.chapters?.find((c) => c.name === "Ch.1")?.id).toBe("comick-ptbr::/c/1");
  });

  it("fills gaps from another language, tagging each chapter's origin", async () => {
    const mangadexPtbr = makeConnector({
      id: "mangadex-ptbr",
      lang: "pt-br",
      search: async () => ({ list: [{ name: "Work", link: "/m/w" }], hasNextPage: false }),
      getDetail: async () => ({ chapters: chaps(2, 1) }),
    });
    const weeb = makeConnector({
      id: "weebcentral",
      lang: "en",
      search: async () => ({ list: [{ name: "Work", link: "/w/w" }], hasNextPage: false }),
      getDetail: async () => ({ chapters: chaps(3, 2, 1) }),
    });

    const get = makeGetMangaDetail(
      catalogOf(work({ id: "1", title: "Work" })),
      registryOf([mangadexPtbr, weeb]),
      idStore,
      cache,
    );
    const { detail } = await get({ id: "1" });
    const byNum = Object.fromEntries((detail.chapters ?? []).map((c) => [c.name, c.lang]));
    expect(byNum).toEqual({ "Ch.3": "en", "Ch.2": "pt-br", "Ch.1": "pt-br" });
  });

  it("matches a reading source via a romaji alias", async () => {
    const weeb = makeConnector({
      id: "weebcentral",
      lang: "en",
      search: async (q) =>
        /kusuriya/i.test(q)
          ? { list: [{ name: "Kusuriya no Hitorigoto", link: "/w/k" }], hasNextPage: false }
          : { list: [], hasNextPage: false },
      getDetail: async () => ({ chapters: chaps(2, 1) }),
    });

    const get = makeGetMangaDetail(
      catalogOf(
        work({ id: "7", title: "The Apothecary Diaries", aliases: ["Kusuriya no Hitorigoto"] }),
      ),
      registryOf([weeb]),
      idStore,
      cache,
    );
    const { detail } = await get({ id: "7" });
    expect(detail.chapters).toHaveLength(2);
  });

  it("renders from AniList even when no reading source has the work", async () => {
    const get = makeGetMangaDetail(
      catalogOf(work({ id: "9", title: "Obscure Work" })),
      registryOf([makeConnector({ id: "mangadex-ptbr", lang: "pt-br" })]),
      idStore,
      cache,
    );
    const { detail } = await get({ id: "9" });
    expect(detail.title).toBe("Obscure Work");
    expect(detail.chapters).toEqual([]);
  });

  it("404s when the id is unknown and there's no name hint", async () => {
    const get = makeGetMangaDetail(catalogOf(null), registryOf([]), idStore, cache);
    expect(get({ id: "nope" })).rejects.toThrow();
  });
});
