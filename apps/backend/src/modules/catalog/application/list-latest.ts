import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";

import type { MangaSummary, Paginated } from "../domain/manga";
import type { ConnectorRegistry } from "../infrastructure/connector-registry";
import { MangaMapper } from "../infrastructure/manga-mapper";

const LATEST_TTL = 10 * 60 * 1000;
const PREFERRED_LANG = "pt-br";
const MAX_POOL = 4;
const PER_CONNECTOR = 12;
const DEADLINE_MS = 12_000;

/**
 * "Recently updated" feed — sourced from the reading connectors (NOT AniList,
 * which only knows a work's start date). Fans out to the connectors that expose
 * `getLatestUpdates`, preferring the request language, bounded by a soft
 * deadline, and round-robin-interleaves their results (deduped by title) so the
 * feed mixes sources rather than grouping them. Cached 10 min — the first cold
 * load per window absorbs the connector latency.
 *
 * Items carry opaque connector ids; the detail page resolves them by the title
 * hint (`?n=`), so the link works even though these aren't AniList ids.
 */
export const makeListLatest =
  (registry: ConnectorRegistry, idStore: IdStore, cache: Cache) =>
  async ({ page = 1 }: { page?: number; lang?: string }): Promise<Paginated<MangaSummary>> => {
    return cache.remember(`latest:${page}`, LATEST_TTL, async () => {
      const pool = registry
        .listCurated()
        .filter((c) => typeof c.getLatestUpdates === "function")
        .sort((a, b) => (a.lang === PREFERRED_LANG ? 0 : 1) - (b.lang === PREFERRED_LANG ? 0 : 1))
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
      const list: MangaSummary[] = [];
      const maxLen = Math.max(0, ...batches.map((b) => b.length));
      for (let i = 0; i < maxLen; i++) {
        for (const batch of batches) {
          const m = batch[i];
          if (!m) continue;
          const key = m.name.trim().toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          list.push(m);
        }
      }

      return { list, hasNextPage: list.length >= MAX_POOL * PER_CONNECTOR };
    });
  };
