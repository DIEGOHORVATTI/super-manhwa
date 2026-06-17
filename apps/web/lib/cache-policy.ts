/**
 * Pure cache-on-read policy helpers, isolated from the DB/R2 clients so they can
 * be unit-tested without pulling in neon/aws-sdk.
 */
export const FRESH_MS = 24 * 60 * 60 * 1000;

/** Whether a URL is absolute http(s) and thus safe to fetch + mirror to R2. */
export function isAbsolute(url: string | null | undefined): url is string {
  return Boolean(url && /^https?:\/\//i.test(url));
}

/** Whether a cached row is stale (older than the freshness window). */
export function isStale(refreshedAt: Date | string | number, now: number = Date.now()): boolean {
  return now - new Date(refreshedAt).getTime() >= FRESH_MS;
}

/**
 * A cached work needs no re-write when it's still fresh AND its cover is mirrored
 * AND its banner is mirrored (or there's no absolute banner URL to mirror). Lets
 * cache-on-read short-circuit without re-hitting R2/Postgres on repeat visits.
 */
export function workCacheUpToDate(
  existing:
    | { coverR2Key: string | null; bannerR2Key: string | null; refreshedAt: Date | string | number }
    | undefined,
  bannerUrl: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!existing || isStale(existing.refreshedAt, now)) return false;
  return Boolean(existing.coverR2Key) && (Boolean(existing.bannerR2Key) || !isAbsolute(bannerUrl));
}
