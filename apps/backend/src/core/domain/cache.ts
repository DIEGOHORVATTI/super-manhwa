/**
 * Generic TTL cache port. Async-friendly so future swaps (Redis, file-backed)
 * are drop-in. Used pervasively by application use cases | cache decisions live
 * in the application layer, the impl is a single instance wired in `container`.
 */
export type Cache = {
  /** Get a cached value, or compute via `fn` (cached for `ttlMs` on success). */
  remember<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T>;
  /** Force-set a value (used by enrichment to seed without an upstream fetch). */
  set<T>(key: string, ttlMs: number, value: T): void;
  /** Read-only inspection | returns undefined if absent or expired. */
  get<T>(key: string): T | undefined;
};
