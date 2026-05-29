import type { MangaMeta as WireMangaMeta } from "@packages/contracts";

import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";

import type { MetadataProvider } from "../domain/manga-meta";

const META_TTL = 6 * 60 * 60 * 1000; // metadata is stable — cache 6h
const EMPTY: WireMangaMeta = { tags: [], characters: [], relations: [] };

/** Proxy an external image URL through our opaque /api/img path. */
const proxy = (idStore: IdStore, url?: string): string | undefined =>
  url ? `/api/img/${idStore.encode({ source: "anilist", url })}` : undefined;

/**
 * Rich metadata for a title (AniList). Best-effort: a miss or upstream error
 * returns an empty meta so the detail page just renders without the extra
 * tabs. Image URLs are proxied like covers/pages so the browser never sees
 * the metadata provider's CDN.
 */
export const makeGetMangaMeta =
  (provider: MetadataProvider, idStore: IdStore, cache: Cache) =>
  async ({ name }: { name: string }): Promise<{ meta: WireMangaMeta }> => {
    const title = name.trim();
    if (!title) return { meta: EMPTY };

    return cache.remember(`meta:${title.toLowerCase()}`, META_TTL, async () => {
      const m = await provider.byTitle(title).catch(() => null);
      if (!m) return { meta: EMPTY };
      return {
        meta: {
          score: m.score,
          bannerImage: proxy(idStore, m.bannerImage),
          description: m.description,
          tags: m.tags,
          characters: m.characters.map((c) => ({
            name: c.name,
            nativeName: c.nativeName,
            role: c.role,
            imageUrl: proxy(idStore, c.imageUrl),
            description: c.description,
            gender: c.gender,
            age: c.age,
            favourites: c.favourites,
          })),
          relations: m.relations,
        },
      };
    });
  };
