import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";

import type { CatalogSource } from "../domain/catalog-source";
import type { MangaSummary, Paginated } from "../domain/manga";
import type { ConnectorRegistry } from "../infrastructure/connector-registry";
import { MangaMapper } from "../infrastructure/manga-mapper";

const LATEST_TTL = 10 * 60 * 1000;
const MATCH_TTL = 24 * 60 * 60 * 1000; // title→AniList match cached a day (misses too)
const PREFERRED_LANG = "pt-br";
const MAX_POOL = 4;
const PER_CONNECTOR = 12;
const DEADLINE_MS = 12_000;

/** Loose title compare: ignore case/punctuation so "Chainsaw Man" ≈ "chainsaw-man". */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/**
 * "Recently updated" feed | sourced from the reading connectors (NOT AniList,
 * which only knows a work's start date). Fans out to the connectors that expose
 * `getLatestUpdates`, preferring the request language, bounded by a soft
 * deadline, and round-robin-interleaves their results (deduped by title) so the
 * feed mixes sources rather than grouping them. Cached 10 min | the first cold
 * load per window absorbs the connector latency.
 *
 * Each item is then matched to its AniList work (by title) so the feed carries
 * the SAME canonical AniList id as the rest of the catalog | one identity per
 * work across favorites/progress/cache. Unmatched items keep the opaque connector
 * id (resolved on the detail page by the title hint).
 * ponytail: a cold match cache fires up to MAX_POOL*PER_CONNECTOR AniList searches
 * in one burst. Upgrade path if it trips AniList's rate limit: throttle/batch them.
 */
export const makeListLatest =
  (registry: ConnectorRegistry, catalog: CatalogSource, idStore: IdStore, cache: Cache) =>
  async ({ page = 1 }: { page?: number; lang?: string }): Promise<Paginated<MangaSummary>> => {
    return cache.remember(`latest:${page}`, LATEST_TTL, async () => {
      const pool = registry
        .listCurated()
        .filter((c) => typeof c.getLatestUpdates === "function")
        .sort(
          (a, b) =>
            (a.langs.includes(PREFERRED_LANG) ? 0 : 1) - (b.langs.includes(PREFERRED_LANG) ? 0 : 1),
        )
        .slice(0, MAX_POOL);

      let timer: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<MangaSummary[]>((resolve) => {
        timer = setTimeout(() => resolve([]), DEADLINE_MS);
      });

      const batches = await Promise.all(
        pool.map((c) =>
          Promise.race([
            (async () => {
              try {
                const res = await c.getLatestUpdates?.(page);
                return (res?.list ?? [])
                  .slice(0, PER_CONNECTOR)
                  .map((raw) => MangaMapper.toSummary(idStore, c, raw));
              } catch {
                return [];
              }
            })(),
            deadline,
          ]),
        ),
      );
      clearTimeout(timer);

      // Round-robin interleave + dedupe by normalized title.
      const seen = new Set<string>();
      const deduped: MangaSummary[] = [];
      const maxLen = Math.max(0, ...batches.map((b) => b.length));
      for (let i = 0; i < maxLen; i++) {
        for (const batch of batches) {
          const m = batch[i];
          if (!m) continue;
          const key = m.name.trim().toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          deduped.push(m);
        }
      }

      // Re-key each item to its canonical AniList work (keeping the connector's
      // language flag) so a matched card shows the AniList cover + id. An unmatched
      // item is a connector-only work (not on AniList) | we keep it as-is, including
      // its connector cover: it's a legitimate work we adopt into our own catalog
      // (the detail page resolves its full metadata from the source).
      const list = await Promise.all(
        deduped.map(async (m) => {
          const target = norm(m.name);
          if (!target) return m;
          const match = await cache.remember(`latest-match:${target}`, MATCH_TTL, async () => {
            try {
              const { items } = await catalog.search(m.name, 1);
              return (
                items.find((it) => {
                  const t = norm(it.title);
                  return t === target || t.includes(target) || target.includes(t);
                }) ?? null
              );
            } catch {
              return null;
            }
          });
          return match
            ? { ...MangaMapper.catalogSummary(idStore, match), lang: m.lang, langs: m.langs }
            : m;
        }),
      );

      return { list, hasNextPage: list.length >= MAX_POOL * PER_CONNECTOR };
    });
  };
