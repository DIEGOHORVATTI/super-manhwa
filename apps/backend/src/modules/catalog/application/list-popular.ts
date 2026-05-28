import type { MangaSort } from "@packages/contracts";
import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";

import type { MangaSummary, Paginated } from "../domain/manga";
import type { MangaCatalog, RawDetail } from "../domain/manga-catalog";
import type { Source, SourceRegistry } from "../domain/source";
import { MangaMapper } from "../infrastructure/manga-mapper";

const POPULAR_TTL = 5 * 60 * 1000;       // raw aggregation cache
const ENRICHED_TTL = 30 * 60 * 1000;     // enriched cache (detail fan-out is expensive)
const DETAIL_TTL = 10 * 60 * 1000;
const ENRICH_TOP_N = 80;                  // bound the fan-out — covers most realistic filters
const ENRICH_CONCURRENCY = 12;

type DetailFetcher = (src: Source, link: string) => Promise<RawDetail>;

const dedupeKey = (name: string) => name.toLowerCase().replace(/\s+/g, " ").trim();
const normGenre = (g: string) => g.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type EnrichedItem = MangaSummary & { _src?: Source; _link?: string; _newestUpload?: number };

/**
 * Pool used for cross-source popular aggregation. Cloudflare-protected sources
 * stay out of this list — they're available for detail/fallback only.
 */
const aggregationPool = (registry: SourceRegistry, lang: string | undefined) => {
  const all = registry.listCurated().filter((s) => !s.hasCloudflare);
  return lang ? all.filter((s) => s.lang === lang) : all;
};

const aggregate = async (
  pool: readonly Source[],
  fetcher: (src: Source) => Promise<{ list?: Array<{ name: string; link: string; imageUrl?: string }> }>,
  idStore: IdStore,
): Promise<{ items: EnrichedItem[]; bySrc: Map<string, Source> }> => {
  const results = await Promise.allSettled(pool.map((src) => fetcher(src).then((r) => ({ src, r }))));
  const seen = new Set<string>();
  const items: EnrichedItem[] = [];
  const bySrc = new Map<string, Source>();
  for (const res of results) {
    if (res.status !== "fulfilled") continue;
    const { src, r } = res.value;
    bySrc.set(src.id, src);
    for (const raw of r.list ?? []) {
      const key = dedupeKey(raw.name);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        ...MangaMapper.toSummary(idStore, src, raw),
        _src: src,
        _link: raw.link,
      });
    }
  }
  return { items, bySrc };
};

/**
 * Concurrency-limited fan-out for detail enrichment. Failures (extension errors,
 * stale selectors) leave items unenriched but keep the listing — better partial
 * than empty.
 */
const enrich = async (
  items: EnrichedItem[],
  detailFetcher: DetailFetcher,
  cache: Cache,
  idStore: IdStore,
): Promise<void> => {
  const targets = items.slice(0, ENRICH_TOP_N);
  let cursor = 0;

  const worker = async () => {
    while (cursor < targets.length) {
      const i = cursor++;
      const item = targets[i];
      if (!item._src || !item._link) continue;
      try {
        const key = `detail:${item._src.id}:${item._link}`;
        const det = await cache.remember(key, DETAIL_TTL, () => detailFetcher(item._src!, item._link!));
        const shaped = MangaMapper.toDetail(idStore, item._src, det);
        item.status = shaped.status;
        item.genres = shaped.genre;
        item._newestUpload = shaped.chapters?.reduce<number>(
          (max, c) => Math.max(max, Number(c.dateUpload ?? 0) || 0),
          0,
        );
      } catch { /* leave unenriched */ }
    }
  };

  await Promise.all(Array.from({ length: ENRICH_CONCURRENCY }, worker));
};

const strip = (item: EnrichedItem): MangaSummary => {
  const { _src, _link, _newestUpload, ...summary } = item;
  return summary;
};

/**
 * Trending across all integrations. Default sort is the raw aggregation order
 * (fast — first request ~5s, cached). `newest`/`completed` and `genre` trigger
 * enrichment (parallel detail calls bounded to top {@link ENRICH_TOP_N}).
 */
export const makeListPopular = (
  registry: SourceRegistry,
  catalog: MangaCatalog,
  idStore: IdStore,
  cache: Cache,
) => async ({ lang, page = 1, genre, sort = "popular" }: {
  lang?: string;
  page?: number;
  genre?: string;
  sort?: MangaSort;
}): Promise<Paginated<MangaSummary>> => {
  const needsEnrichment = sort !== "popular" || !!genre;

  const rawKey = `popular:${lang ?? "*"}:${page}`;
  const raw = await cache.remember(rawKey, POPULAR_TTL, async () => {
    const pool = aggregationPool(registry, lang);
    return aggregate(pool, (src) => catalog.getPopular(src, page), idStore);
  });

  if (!needsEnrichment) {
    return { list: raw.items.map(strip), hasNextPage: raw.items.length >= 20 };
  }

  const enrichedKey = `popular-enriched:${lang ?? "*"}:${page}`;
  let enriched = cache.get<EnrichedItem[]>(enrichedKey);
  if (!enriched) {
    // Clone so the cached raw items keep their shape across other callers.
    enriched = raw.items.map((m) => ({ ...m }));
    await enrich(enriched, (src, link) => catalog.getDetail(src, link), cache, idStore);
    cache.set(enrichedKey, ENRICHED_TTL, enriched);
  }

  let filtered: EnrichedItem[] = enriched;
  if (genre) {
    const g = normGenre(genre);
    filtered = filtered.filter((m) => m.genres?.some((x) => normGenre(x) === g));
  }
  if (sort === "completed") {
    filtered = filtered.filter((m) => m.status === "completed" || m.status === "publishing-finished");
  }
  if (sort === "newest") {
    filtered = [...filtered].sort((a, b) => (b._newestUpload ?? 0) - (a._newestUpload ?? 0));
  }

  return { list: filtered.map(strip), hasNextPage: false };
};
