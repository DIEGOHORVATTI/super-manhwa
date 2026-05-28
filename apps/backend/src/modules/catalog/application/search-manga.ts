import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";

import type { MangaSummary, Paginated } from "../domain/manga";
import type { MangaCatalog } from "../domain/manga-catalog";
import type { SourceRegistry } from "../domain/source";
import { MangaMapper } from "../infrastructure/manga-mapper";

const SEARCH_TTL = 5 * 60 * 1000;
const dedupeKey = (n: string) => n.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Cross-source search. Genre is not pushed to the upstream extensions (each one
 * uses its own taxonomy); we just use the name search and let downstream genre
 * filtering happen on enriched data via `list-popular`.
 */
export const makeSearchManga = (
  registry: SourceRegistry,
  catalog: MangaCatalog,
  idStore: IdStore,
  cache: Cache,
) => async ({ q, lang, page = 1 }: {
  q: string;
  lang?: string;
  page?: number;
}): Promise<Paginated<MangaSummary>> => {
  const trimmed = q.trim();
  if (!trimmed) return { list: [], hasNextPage: false };

  const key = `search:${trimmed.toLowerCase()}:${lang ?? "*"}:${page}`;
  return cache.remember(key, SEARCH_TTL, async () => {
    const pool = registry.listCurated().filter((s) => !s.hasCloudflare && (!lang || s.lang === lang));
    const results = await Promise.allSettled(
      pool.map((src) => catalog.search(src, trimmed, page).then((r) => ({ src, r }))),
    );
    const seen = new Set<string>();
    const list: MangaSummary[] = [];
    for (const res of results) {
      if (res.status !== "fulfilled") continue;
      const { src, r } = res.value;
      for (const raw of r.list ?? []) {
        const key = dedupeKey(raw.name);
        if (seen.has(key)) continue;
        seen.add(key);
        list.push(MangaMapper.toSummary(idStore, src, raw));
      }
    }
    return { list, hasNextPage: list.length >= 20 };
  });
};
