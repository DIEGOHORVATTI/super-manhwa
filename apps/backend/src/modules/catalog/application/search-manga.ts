import type { MangaStatus } from "@packages/contracts";
import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";

import type { CatalogSource } from "../domain/catalog-source";
import type { MangaSummary, Paginated } from "../domain/manga";
import { MangaMapper } from "../infrastructure/manga-mapper";
import { type ConnectorSearch, mergeSummaries } from "./connector-search";

const SEARCH_TTL = 5 * 60 * 1000;
const SEARCH_LIMIT = 30;

/**
 * Search the AniList catalog, then augment with the actual reading sources so
 * readable-but-unindexed works surface (see {@link ConnectorSearch}). The
 * connector pass runs only on page 1 with no genre/status filter (those are
 * AniList-only facets); deeper pages stay pure AniList.
 */
export const makeSearchManga =
  (catalog: CatalogSource, idStore: IdStore, cache: Cache, connectorSearch: ConnectorSearch) =>
  async ({
    q,
    page = 1,
    genre,
    status,
  }: {
    q: string;
    lang?: string;
    page?: number;
    genre?: string;
    status?: MangaStatus;
  }): Promise<Paginated<MangaSummary>> => {
    const trimmed = q.trim();
    if (!trimmed) return { list: [], hasNextPage: false };

    const key = `search:${trimmed.toLowerCase()}:${genre ?? "*"}:${status ?? "*"}:${page}`;
    return cache.remember(key, SEARCH_TTL, async () => {
      const { items, hasNextPage } = await catalog.search(trimmed, page, { genre, status });
      const anilist = items.map((it) => MangaMapper.catalogSummary(idStore, it));

      // Connectors enrich only the unfiltered first page (genre/status are AniList facets).
      if (page > 1 || genre || status) return { list: anilist, hasNextPage };

      const connector = await connectorSearch(trimmed, { limit: SEARCH_LIMIT });
      const list = mergeSummaries(trimmed, anilist, connector, SEARCH_LIMIT);
      return { list, hasNextPage: hasNextPage || list.length > anilist.length };
    });
  };
