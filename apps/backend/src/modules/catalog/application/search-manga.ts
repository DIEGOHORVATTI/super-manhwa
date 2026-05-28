import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";

import type { MangaSummary, Paginated } from "../domain/manga";
import type { ConnectorRegistry } from "../infrastructure/connector-registry";
import { MangaMapper } from "../infrastructure/manga-mapper";

const SEARCH_TTL = 5 * 60 * 1000;
const dedupeKey = (n: string) => n.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Cross-source search. Genre is not pushed to the upstream extensions (each
 * uses its own taxonomy); downstream genre filtering happens on enriched data
 * via `list-popular`.
 */
export const makeSearchManga =
  (registry: ConnectorRegistry, idStore: IdStore, cache: Cache) =>
  async ({
    q,
    lang,
    page = 1,
  }: {
    q: string;
    lang?: string;
    page?: number;
  }): Promise<Paginated<MangaSummary>> => {
    const trimmed = q.trim();
    if (!trimmed) return { list: [], hasNextPage: false };

    const key = `search:${trimmed.toLowerCase()}:${lang ?? "*"}:${page}`;
    return cache.remember(key, SEARCH_TTL, async () => {
      const pool = registry
        .listCurated()
        .filter((c) => !c.hasCloudflare && (!lang || c.lang === lang));
      const results = await Promise.allSettled(
        pool.map((c) => c.search(trimmed, page).then((r) => ({ connector: c, r }))),
      );
      const seen = new Set<string>();
      const list: MangaSummary[] = [];
      for (const res of results) {
        if (res.status !== "fulfilled") continue;
        const { connector, r } = res.value;
        for (const raw of r.list ?? []) {
          const k = dedupeKey(raw.name);
          if (seen.has(k)) continue;
          seen.add(k);
          list.push(MangaMapper.toSummary(idStore, connector, raw));
        }
      }
      return { list, hasNextPage: list.length >= 20 };
    });
  };
