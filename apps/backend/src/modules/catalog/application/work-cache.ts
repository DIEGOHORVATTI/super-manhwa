import type { Cache } from "@/core/domain/cache";

import type { CatalogSource, CatalogWork } from "../domain/catalog-source";

/** Work metadata is stable | cache the AniList record well past a page view. */
const WORK_TTL = 30 * 60 * 1000;

/**
 * Cached resolution of a work's canonical catalog record (AniList `byId`). Both
 * the fast metadata route (`get-manga-core`) and the slow chapter fan-out
 * (`get-manga-chapters`) need the same record | title/aliases to match reading
 * sources, plus the non-chapter display fields. Sharing this key means the
 * AniList round-trip happens once (single-flight dedupes concurrent callers) and
 * stays warm for 30 min, so a cold chapter cache no longer re-fetches metadata.
 */
export const loadWork = (
  cache: Cache,
  catalog: CatalogSource,
  id: string,
): Promise<CatalogWork | null> =>
  cache.remember(`work:${id}`, WORK_TTL, () => catalog.byId(id).catch(() => null));
