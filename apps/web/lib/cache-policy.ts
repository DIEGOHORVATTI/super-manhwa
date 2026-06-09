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
