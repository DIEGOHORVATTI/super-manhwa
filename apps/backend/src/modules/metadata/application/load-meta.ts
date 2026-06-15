import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";
import { signCoverPath } from "@/shared/image-sign";

import type { MangaMeta, MetadataProvider } from "../domain/manga-meta";

const META_TTL = 6 * 60 * 60 * 1000; // metadata is stable | cache 6h

/**
 * One cached AniList lookup behind a single key, so the `meta` and `characters`
 * routes (two endpoints, same upstream record) share one provider round-trip.
 * Best-effort: a miss or upstream error resolves to null and each route renders
 * its empty shape.
 */
export const makeLoadMeta =
  (provider: MetadataProvider, cache: Cache) =>
  (title: string): Promise<MangaMeta | null> =>
    cache.remember(`anilist:${title.toLowerCase()}`, META_TTL, () =>
      provider.byTitle(title).catch(() => null),
    );

export type LoadMeta = ReturnType<typeof makeLoadMeta>;

/** Proxy an external image URL through our opaque, public-signed /api/img path. */
export const proxyImage = (idStore: IdStore, url?: string): string | undefined =>
  url ? signCoverPath(`/api/img/${idStore.encode({ source: "anilist", url })}`) : undefined;
