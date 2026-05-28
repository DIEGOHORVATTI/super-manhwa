import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";

import type { MangaSummary } from "../domain/manga";
import type { MangaCatalog } from "../domain/manga-catalog";
import type { SourceRegistry } from "../domain/source";
import { MangaMapper } from "../infrastructure/manga-mapper";

const SUGGEST_TTL = 5 * 60 * 1000;
const SUGGEST_LIMIT = 10;
const FAST_SOURCE_ID = "mangadex"; // MangaDex has the broadest catalogue + fastest JSON API

/**
 * Autocomplete-grade suggestions. Hits a single fast source (MangaDex API) with
 * a tight timeout instead of fanning out — typing latency matters here.
 */
export const makeSuggestManga =
  (registry: SourceRegistry, catalog: MangaCatalog, idStore: IdStore, cache: Cache) =>
  async ({ q, lang }: { q: string; lang?: string }): Promise<{ list: MangaSummary[] }> => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return { list: [] };

    const key = `suggest:${trimmed.toLowerCase()}:${lang ?? "*"}`;
    return cache.remember(key, SUGGEST_TTL, async () => {
      const src = registry.listCurated().find((s) => s.id === FAST_SOURCE_ID);
      if (!src) return { list: [] };
      try {
        const r = await catalog.search(src, trimmed, 1);
        const list = (r.list ?? [])
          .slice(0, SUGGEST_LIMIT)
          .map((raw) => MangaMapper.toSummary(idStore, src, raw));
        return { list };
      } catch {
        return { list: [] };
      }
    });
  };
