import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";
import { badRequest, notFound } from "@/shared/errors";

import type { MangaDetail } from "../domain/manga";
import type { MangaCatalog, RawDetail } from "../domain/manga-catalog";
import type { Source, SourceRegistry } from "../domain/source";
import { MangaMapper } from "../infrastructure/manga-mapper";

const DETAIL_TTL = 10 * 60 * 1000;
const FALLBACK_PRIORITY = ["manhwaz", "mangaworld", "weebcentral", "webtoons"];

const normName = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Memoised mapping `id → working alternate {source, url}`. Populated when we
 * resolve a DMCA-blocked or extension-broken primary to an alt — subsequent
 * loads of the same id skip the cross-source search entirely. The shape
 * matches `IdStore.decode(id)` so the call site stays uniform.
 */
const fallbackMap = new Map<string, { source: string; url: string }>();

const findAlternate = async (
  registry: SourceRegistry,
  catalog: MangaCatalog,
  name: string,
  excludeSourceId: string,
): Promise<{ src: Source; link: string; raw: RawDetail } | null> => {
  const target = normName(name);
  const pool = registry
    .listCurated()
    .filter((s) => s.id !== excludeSourceId && !s.hasCloudflare)
    .sort((a, b) => {
      const ai = FALLBACK_PRIORITY.indexOf(a.id);
      const bi = FALLBACK_PRIORITY.indexOf(b.id);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  const searches = await Promise.allSettled(
    pool.map((src) =>
      catalog.search(src, name, 1).then((r) => {
        const hit = (r.list ?? []).find((m) => normName(m.name) === target) ?? r.list?.[0];
        return { src, hit };
      }),
    ),
  );

  for (const res of searches) {
    if (res.status !== "fulfilled" || !res.value.hit) continue;
    const { src, hit } = res.value;
    try {
      const raw = await catalog.getDetail(src, hit.link);
      if (raw?.chapters && raw.chapters.length > 0) return { src, link: hit.link, raw };
    } catch {
      /* try next */
    }
  }
  return null;
};

/**
 * Fetch a manga's details. The primary source may have the title with no
 * chapters (DMCA takedown) or throw a stale-selector parse error — in both
 * cases, if a name hint is provided we search across other integrations and
 * transparently return the first alternate that has chapters.
 */
export const makeGetMangaDetail =
  (registry: SourceRegistry, catalog: MangaCatalog, idStore: IdStore, cache: Cache) =>
  async ({
    id,
    name,
  }: {
    id: string;
    name?: string;
  }): Promise<{ detail: MangaDetail; lang: string }> => {
    const ref = idStore.decode(id);
    if (!ref) throw badRequest("invalid manga id");

    const cached = fallbackMap.get(id);
    const primary = cached ?? { source: ref.source, url: ref.url };
    const src = await registry.resolve(primary.source);
    if (!src) throw notFound("unknown source");

    let shaped: MangaDetail | null = null;
    let primaryErr: Error | null = null;
    try {
      const key = `detail:${src.id}:${primary.url}`;
      const raw = await cache.remember(key, DETAIL_TTL, () => catalog.getDetail(src, primary.url));
      shaped = MangaMapper.toDetail(idStore, src, raw ?? {});
      if (shaped.chapters && shaped.chapters.length > 0) {
        return { detail: shaped, lang: src.lang };
      }
    } catch (e) {
      primaryErr = e instanceof Error ? e : new Error(String(e));
    }

    const hint = name ?? shaped?.title;
    if (hint) {
      const alt = await findAlternate(registry, catalog, hint, primary.source);
      if (alt) {
        fallbackMap.set(id, { source: alt.src.id, url: alt.link });
        const altShaped = MangaMapper.toDetail(idStore, alt.src, alt.raw);
        return { detail: altShaped, lang: alt.src.lang };
      }
    }

    if (primaryErr) throw primaryErr;
    return { detail: shaped!, lang: src.lang };
  };
