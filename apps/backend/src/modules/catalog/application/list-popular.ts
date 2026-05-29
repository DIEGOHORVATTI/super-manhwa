import type { MangaSort } from "@packages/contracts";
import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";

import type { CatalogSort, CatalogSource } from "../domain/catalog-source";
import type { MangaSummary, Paginated } from "../domain/manga";
import { MangaMapper } from "../infrastructure/manga-mapper";

const POPULAR_TTL = 5 * 60 * 1000;

// The home (no explicit sort) shows what's trending; the tabs map 1:1 otherwise.
const toCatalogSort = (sort?: MangaSort): CatalogSort => (sort === undefined ? "trending" : sort);

/**
 * Browse listing, sourced from the AniList catalog. Sort + genre are pushed to
 * the catalog query (no cross-source aggregation/enrichment needed anymore), so
 * results are one consistent set of works keyed by AniList id.
 */
export const makeListPopular =
  (catalog: CatalogSource, idStore: IdStore, cache: Cache) =>
  async ({
    page = 1,
    genre,
    sort,
  }: {
    lang?: string;
    page?: number;
    genre?: string;
    sort?: MangaSort;
  }): Promise<Paginated<MangaSummary>> => {
    const catalogSort = toCatalogSort(sort);
    const key = `catalog:${catalogSort}:${genre ?? "*"}:${page}`;
    return cache.remember(key, POPULAR_TTL, async () => {
      const items = await catalog.list({ sort: catalogSort, genre, page });
      return {
        list: items.map((it) => MangaMapper.catalogSummary(idStore, it)),
        hasNextPage: items.length >= 20,
      };
    });
  };
