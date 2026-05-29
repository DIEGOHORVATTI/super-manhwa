import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";

import type { CatalogSource } from "../domain/catalog-source";
import type { MangaSummary } from "../domain/manga";
import { MangaMapper } from "../infrastructure/manga-mapper";

const SUGGEST_TTL = 5 * 60 * 1000;
const SUGGEST_LIMIT = 10;

/**
 * Autocomplete suggestions from the AniList catalog. The chapter badge comes
 * from AniList's own count (the official total), so it reflects the real number
 * of chapters, not what a single reading source happens to expose.
 */
export const makeSuggestManga =
  (catalog: CatalogSource, idStore: IdStore, cache: Cache) =>
  async ({ q }: { q: string; lang?: string }): Promise<{ list: MangaSummary[] }> => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return { list: [] };

    const key = `suggest:${trimmed.toLowerCase()}`;
    return cache.remember(key, SUGGEST_TTL, async () => {
      const items = (await catalog.search(trimmed, 1)).slice(0, SUGGEST_LIMIT);
      return { list: items.map((it) => MangaMapper.catalogSummary(idStore, it)) };
    });
  };
