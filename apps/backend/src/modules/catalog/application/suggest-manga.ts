import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";

import type { CatalogSource } from "../domain/catalog-source";
import type { MangaSummary } from "../domain/manga";
import { MangaMapper } from "../infrastructure/manga-mapper";
import { type ConnectorSearch, mergeSummaries } from "./connector-search";

const SUGGEST_TTL = 5 * 60 * 1000;
const SUGGEST_LIMIT = 10;
/** Below this, only AniList runs | connector scraping on 2–3 char prefixes would
 *  hammer the sources for little signal. Real titles clear it easily. */
const CONNECTOR_MIN_LEN = 4;

/**
 * Autocomplete suggestions. AniList first (fast, with official chapter counts),
 * then augmented with the actual reading sources via {@link ConnectorSearch} so
 * works AniList indexes poorly (or not at all) are still findable | deduped by
 * title. The connector pass is gated by query length and soft-deadline-bounded,
 * so common queries stay snappy and only "AniList can't find it" ones pay for it.
 */
export const makeSuggestManga =
  (catalog: CatalogSource, idStore: IdStore, cache: Cache, connectorSearch: ConnectorSearch) =>
  async ({ q }: { q: string; lang?: string }): Promise<{ list: MangaSummary[] }> => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return { list: [] };

    const key = `suggest:${trimmed.toLowerCase()}`;
    return cache.remember(key, SUGGEST_TTL, async () => {
      const { items } = await catalog.search(trimmed, 1);
      const anilist = items
        .slice(0, SUGGEST_LIMIT)
        .map((it) => MangaMapper.catalogSummary(idStore, it));
      if (trimmed.length < CONNECTOR_MIN_LEN) return { list: anilist };

      const connector = await connectorSearch(trimmed, { limit: SUGGEST_LIMIT });
      return { list: mergeSummaries(trimmed, anilist, connector, SUGGEST_LIMIT) };
    });
  };
