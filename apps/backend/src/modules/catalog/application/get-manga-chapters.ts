import type { MangaConnector } from "@packages/extension";
import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";

import type { CatalogSource } from "../domain/catalog-source";
import type { Chapter, MangaDetail } from "../domain/manga";
import type { ConnectorRegistry } from "../infrastructure/connector-registry";
import { MangaMapper } from "../infrastructure/manga-mapper";
import {
  type ChapterSource,
  mergeChapters,
  orderCompletenessPool,
  priorityOf,
  titleMatches,
} from "./completeness";
import { loadWork } from "./work-cache";

const DETAIL_TTL = 10 * 60 * 1000;
const SEARCH_TTL = 10 * 60 * 1000;
const MERGED_TTL = 10 * 60 * 1000;
/** Preferred reading language | chapters in this language win on duplicates. */
const PREFERRED_LANG = "pt-br";
/** Max connectors we fan out to per detail load | bounds latency. */
const MAX_POOL = 6;
/** Max title variants (catalog title + aliases) we search each connector by. */
const MAX_QUERIES = 2;
/**
 * Soft deadline for the whole fan-out. Connectors that miss it keep running in
 * the background (warming the per-connector search/detail caches), so the next
 * load | even before the merged cache expires elsewhere | is fast and more
 * complete. A first cold load returns within this bound rather than hanging.
 */
const FANOUT_DEADLINE_MS = 40_000;

const uniqStrings = (xs: Array<string | undefined>): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    const v = x?.trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
};

/**
 * Slow half of the obra page: a work's chapters, unioned across reading sources.
 * Identity comes from the AniList catalog (the `id` is an AniList id, shared with
 * {@link makeGetMangaCore} via the cached {@link loadWork}): we take its title +
 * aliases, fan out across the reading connectors | matching the same work by
 * (English-aligned) title | and union every source's chapters, deduped by number,
 * preferring {@link PREFERRED_LANG}. Non-chapter content lives in the `core`
 * route, so the page renders even when no reading source carries the work.
 */
export const makeGetMangaChapters =
  (catalog: CatalogSource, registry: ConnectorRegistry, idStore: IdStore, cache: Cache) =>
  async ({
    id,
    name,
  }: {
    id: string;
    name?: string;
  }): Promise<{ chapters: Chapter[]; lang: string }> => {
    /** Search a candidate connector for this work and return its shaped detail. */
    const resolveAlt = async (
      connector: MangaConnector,
      queries: string[],
      targets: string[],
    ): Promise<{ priority: number; shaped: MangaDetail } | null> => {
      // Ask the source in the preferred language when it serves it, else its
      // own first language (fallback). The chosen language tags every chapter
      // and namespaces the cache so per-language requests never collide.
      const qlang = connector.langs.includes(PREFERRED_LANG) ? PREFERRED_LANG : connector.langs[0];
      for (const q of queries) {
        try {
          const r = await cache.remember(
            `search:${connector.id}:${qlang}:${q.toLowerCase()}`,
            SEARCH_TTL,
            () => connector.search(q, 1, qlang),
          );
          const hit = (r.list ?? []).find((m) => titleMatches(m.name, targets));
          if (!hit) continue;
          const raw = await cache.remember(
            `detail:${connector.id}:${qlang}:${hit.link}`,
            DETAIL_TTL,
            () => connector.getDetail(hit.link, qlang),
          );
          const shaped = MangaMapper.toDetail(idStore, connector, raw ?? {}, qlang);
          if (shaped.chapters && shaped.chapters.length > 0) {
            return { priority: priorityOf(connector.id), shaped };
          }
        } catch {
          /* try the next query / connector */
        }
      }
      return null;
    };

    return cache.remember(`chapters:${id}`, MERGED_TTL, async () => {
      // Connector-direct path: a work opened by its own opaque id whose source is
      // a NOVEL serves its chapters straight from that one connector | the
      // cross-source merge-by-number below is image-manga logic and would be
      // wrong for prose. Best-effort: any failure falls through to the fan-out.
      const ref = idStore.decode(id);
      if (ref) {
        const direct = await registry.resolve(ref.source);
        if (direct?.format === "novel") {
          try {
            const lang = direct.langs.includes(PREFERRED_LANG) ? PREFERRED_LANG : direct.langs[0];
            const raw = await cache.remember(
              `detail:${direct.id}:${lang}:${ref.url}`,
              DETAIL_TTL,
              () => direct.getDetail(ref.url, lang),
            );
            const shaped = MangaMapper.toDetail(idStore, direct, raw ?? {}, lang);
            return { chapters: shaped.chapters ?? [], lang };
          } catch {
            /* novel source down → fall through (likely returns empty) */
          }
        }
      }

      const work = await loadWork(cache, catalog, id);

      // Title variants to find the same work across reading sources.
      const targets = uniqStrings([work?.title, name, ...(work?.aliases ?? [])]);
      const queries = targets.slice(0, MAX_QUERIES);

      // Bound the whole fan-out: connectors that miss the deadline keep running
      // (warming caches) but don't hold up the response.
      let alts: Array<{ priority: number; shaped: MangaDetail }> = [];
      if (targets.length > 0) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const deadline = new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), FANOUT_DEADLINE_MS);
        });
        // Image sources only | novels never merge into the page-chapter pool.
        const imagePool = registry.listCurated().filter((c) => c.format !== "novel");
        const pool = orderCompletenessPool(imagePool, PREFERRED_LANG, "").slice(0, MAX_POOL);
        const settled = await Promise.all(
          pool.map((c) => Promise.race([resolveAlt(c, queries, targets), deadline])),
        );
        clearTimeout(timer);
        alts = settled.filter((a): a is { priority: number; shaped: MangaDetail } => a != null);
      }

      const sources: ChapterSource[] = alts.map((a) => ({
        lang: a.shaped.lang,
        priority: a.priority,
        chapters: a.shaped.chapters ?? [],
      }));
      const chapters: Chapter[] = mergeChapters(sources, PREFERRED_LANG);

      return { chapters, lang: PREFERRED_LANG };
    });
  };
