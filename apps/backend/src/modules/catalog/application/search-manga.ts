import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";

import type { CatalogSource } from "../domain/catalog-source";
import type { MangaSummary, Paginated } from "../domain/manga";
import { MangaMapper } from "../infrastructure/manga-mapper";

const SEARCH_TTL = 5 * 60 * 1000;

/**
 * Search the AniList catalog. One consistent result set (no cross-source dedup),
 * keyed by AniList id; reading sources are matched later on the detail page.
 */
export const makeSearchManga =
  (catalog: CatalogSource, idStore: IdStore, cache: Cache) =>
  async ({
    q,
    page = 1,
  }: {
    q: string;
    lang?: string;
    page?: number;
  }): Promise<Paginated<MangaSummary>> => {
    const trimmed = q.trim();
    if (!trimmed) return { list: [], hasNextPage: false };

    const key = `search:${trimmed.toLowerCase()}:${page}`;
    return cache.remember(key, SEARCH_TTL, async () => {
      const items = await catalog.search(trimmed, page);
      return {
        list: items.map((it) => MangaMapper.catalogSummary(idStore, it)),
        hasNextPage: items.length >= 20,
      };
    });
  };
