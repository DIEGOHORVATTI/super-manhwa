import type { MangaSort } from "@packages/contracts";
import type { MangaConnector, RawDetail } from "@packages/extension";
import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";

import type { MangaSummary, Paginated } from "../domain/manga";
import type { ConnectorRegistry } from "../infrastructure/connector-registry";
import { MangaMapper } from "../infrastructure/manga-mapper";

const POPULAR_TTL = 5 * 60 * 1000;
const ENRICHED_TTL = 30 * 60 * 1000;
const DETAIL_TTL = 10 * 60 * 1000;
const ENRICH_TOP_N = 80;
const ENRICH_CONCURRENCY = 12;

const dedupeKey = (name: string) => name.toLowerCase().replace(/\s+/g, " ").trim();
const normGenre = (g: string) =>
  g
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

type EnrichedItem = MangaSummary & {
  _connector?: MangaConnector;
  _link?: string;
  _newestUpload?: number;
};

/**
 * Pool used for cross-source popular aggregation. Cloudflare-protected
 * connectors stay out — they're available for detail/fallback only.
 */
const aggregationPool = (
  registry: ConnectorRegistry,
  lang: string | undefined,
): readonly MangaConnector[] => {
  const all = registry.listCurated().filter((c) => !c.hasCloudflare);
  return lang ? all.filter((c) => c.lang === lang) : all;
};

const aggregate = async (
  pool: readonly MangaConnector[],
  page: number,
  idStore: IdStore,
): Promise<{ items: EnrichedItem[] }> => {
  const results = await Promise.allSettled(
    pool.map((c) => c.getPopular(page).then((r) => ({ connector: c, r }))),
  );
  const seen = new Set<string>();
  const items: EnrichedItem[] = [];
  for (const res of results) {
    if (res.status !== "fulfilled") continue;
    const { connector, r } = res.value;
    for (const raw of r.list ?? []) {
      const key = dedupeKey(raw.name);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        ...MangaMapper.toSummary(idStore, connector, raw),
        _connector: connector,
        _link: raw.link,
      });
    }
  }
  return { items };
};

const enrich = async (items: EnrichedItem[], cache: Cache, idStore: IdStore): Promise<void> => {
  const targets = items.slice(0, ENRICH_TOP_N);
  let cursor = 0;
  const worker = async () => {
    while (cursor < targets.length) {
      const i = cursor++;
      const item = targets[i];
      if (!item._connector || !item._link) continue;
      try {
        const key = `detail:${item._connector.id}:${item._link}`;
        const det = await cache.remember(key, DETAIL_TTL, () =>
          item._connector!.getDetail(item._link!),
        );
        const shaped = MangaMapper.toDetail(idStore, item._connector, det);
        item.status = shaped.status;
        item.genres = shaped.genre;
        item._newestUpload = shaped.chapters?.reduce<number>(
          (max, c) => Math.max(max, Number(c.dateUpload ?? 0) || 0),
          0,
        );
      } catch {
        /* leave unenriched */
      }
    }
  };
  await Promise.all(Array.from({ length: ENRICH_CONCURRENCY }, worker));
};

const strip = (item: EnrichedItem): MangaSummary => {
  const { _connector, _link, _newestUpload, ...summary } = item;
  return summary;
};

/**
 * Trending across all integrations. Default sort is the raw aggregation order
 * (fast — first request ~5s, cached). `newest`/`completed` and `genre` trigger
 * enrichment (parallel detail calls bounded to top {@link ENRICH_TOP_N}).
 */
export const makeListPopular =
  (registry: ConnectorRegistry, idStore: IdStore, cache: Cache) =>
  async ({
    lang,
    page = 1,
    genre,
    sort = "popular",
  }: {
    lang?: string;
    page?: number;
    genre?: string;
    sort?: MangaSort;
  }): Promise<Paginated<MangaSummary>> => {
    const needsEnrichment = sort !== "popular" || !!genre;

    const rawKey = `popular:${lang ?? "*"}:${page}`;
    const raw = await cache.remember(rawKey, POPULAR_TTL, async () => {
      const pool = aggregationPool(registry, lang);
      return aggregate(pool, page, idStore);
    });

    if (!needsEnrichment) {
      return { list: raw.items.map(strip), hasNextPage: raw.items.length >= 20 };
    }

    const enrichedKey = `popular-enriched:${lang ?? "*"}:${page}`;
    let enriched = cache.get<EnrichedItem[]>(enrichedKey);
    if (!enriched) {
      enriched = raw.items.map((m) => ({ ...m }));
      await enrich(enriched, cache, idStore);
      cache.set(enrichedKey, ENRICHED_TTL, enriched);
    }

    let filtered: EnrichedItem[] = enriched;
    if (genre) {
      const g = normGenre(genre);
      filtered = filtered.filter((m) => m.genres?.some((x) => normGenre(x) === g));
    }
    if (sort === "completed") {
      filtered = filtered.filter(
        (m) => m.status === "completed" || m.status === "publishing-finished",
      );
    }
    if (sort === "newest") {
      filtered = [...filtered].sort((a, b) => (b._newestUpload ?? 0) - (a._newestUpload ?? 0));
    }

    return { list: filtered.map(strip), hasNextPage: false };
  };

// `RawDetail` re-export so the test suite can `import type` without leaking
// the package boundary into every test file.
export type { RawDetail };
