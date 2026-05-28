import type { MangaConnector, RawDetail } from "@packages/extension";
import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";
import { badRequest, notFound } from "@/shared/errors";

import type { MangaDetail } from "../domain/manga";
import type { ConnectorRegistry } from "../infrastructure/connector-registry";
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
 * loads of the same id skip the cross-source search entirely.
 */
const fallbackMap = new Map<string, { source: string; url: string }>();

const findAlternate = async (
  registry: ConnectorRegistry,
  name: string,
  excludeConnectorId: string,
): Promise<{ connector: MangaConnector; link: string; raw: RawDetail } | null> => {
  const target = normName(name);
  const pool = registry
    .listCurated()
    .filter((c) => c.id !== excludeConnectorId && !c.hasCloudflare)
    .sort((a, b) => {
      const ai = FALLBACK_PRIORITY.indexOf(a.id);
      const bi = FALLBACK_PRIORITY.indexOf(b.id);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  const searches = await Promise.allSettled(
    pool.map((connector) =>
      connector.search(name, 1).then((r) => {
        const hit = (r.list ?? []).find((m) => normName(m.name) === target) ?? r.list?.[0];
        return { connector, hit };
      }),
    ),
  );

  for (const res of searches) {
    if (res.status !== "fulfilled" || !res.value.hit) continue;
    const { connector, hit } = res.value;
    try {
      const raw = await connector.getDetail(hit.link);
      if (raw?.chapters && raw.chapters.length > 0) return { connector, link: hit.link, raw };
    } catch {
      /* try next */
    }
  }
  return null;
};

/**
 * Fetch a manga's details. If the primary connector returns zero chapters
 * (DMCA) or throws (stale selectors), and we have a name hint, fan out to
 * other curated connectors and transparently return the first alternate
 * that yields chapters.
 */
export const makeGetMangaDetail =
  (registry: ConnectorRegistry, idStore: IdStore, cache: Cache) =>
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
    const connector = await registry.resolve(primary.source);
    if (!connector) throw notFound("unknown source");

    let shaped: MangaDetail | null = null;
    let primaryErr: Error | null = null;
    try {
      const key = `detail:${connector.id}:${primary.url}`;
      const raw = await cache.remember(key, DETAIL_TTL, () => connector.getDetail(primary.url));
      shaped = MangaMapper.toDetail(idStore, connector, raw ?? {});
      if (shaped.chapters && shaped.chapters.length > 0) {
        return { detail: shaped, lang: connector.lang };
      }
    } catch (e) {
      primaryErr = e instanceof Error ? e : new Error(String(e));
    }

    const hint = name ?? shaped?.title;
    if (hint) {
      const alt = await findAlternate(registry, hint, primary.source);
      if (alt) {
        fallbackMap.set(id, { source: alt.connector.id, url: alt.link });
        const altShaped = MangaMapper.toDetail(idStore, alt.connector, alt.raw);
        return { detail: altShaped, lang: alt.connector.lang };
      }
    }

    if (primaryErr) throw primaryErr;
    return { detail: shaped!, lang: connector.lang };
  };
