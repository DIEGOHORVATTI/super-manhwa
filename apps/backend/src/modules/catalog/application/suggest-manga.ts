import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";

import type { MangaSummary } from "../domain/manga";
import type { ConnectorRegistry } from "../infrastructure/connector-registry";
import { MangaMapper } from "../infrastructure/manga-mapper";

const SUGGEST_TTL = 5 * 60 * 1000;
const SUGGEST_LIMIT = 10;

/**
 * MangaDex serves the same backend across every language variant — we just
 * use the connector whose source-context lang matches the request. Add new
 * entries here when we vendor more lang-scoped MangaDex connectors.
 */
const FAST_BY_LANG: Record<string, string> = {
  "pt-br": "mangadex-ptbr",
};
const FAST_DEFAULT = "mangadex";

/**
 * Autocomplete-grade suggestions. Hits a single fast connector (MangaDex API)
 * with a tight timeout instead of fanning out — typing latency matters here.
 * Picks the right lang-scoped connector so titles come back already localised.
 */
export const makeSuggestManga =
  (registry: ConnectorRegistry, idStore: IdStore, cache: Cache) =>
  async ({ q, lang }: { q: string; lang?: string }): Promise<{ list: MangaSummary[] }> => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return { list: [] };

    const key = `suggest:${trimmed.toLowerCase()}:${lang ?? "*"}`;
    return cache.remember(key, SUGGEST_TTL, async () => {
      const connectorId = (lang && FAST_BY_LANG[lang]) ?? FAST_DEFAULT;
      const connector = registry.listCurated().find((c) => c.id === connectorId);
      if (!connector) return { list: [] };
      try {
        const r = await connector.search(trimmed, 1);
        const list = (r.list ?? [])
          .slice(0, SUGGEST_LIMIT)
          .map((raw) => MangaMapper.toSummary(idStore, connector, raw));
        return { list };
      } catch {
        return { list: [] };
      }
    });
  };
