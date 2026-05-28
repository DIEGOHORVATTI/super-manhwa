import type { Cache } from "../domain/cache";

interface Entry {
  exp: number;
  value: unknown;
}

/**
 * In-process TTL cache with a hard size cap. Process-scoped — survives requests
 * but not restarts. Good enough for popular-list caching where data is cheap to
 * re-derive on the next miss.
 */
export const makeMemoryCache = (maxEntries = 500): Cache => {
  const map = new Map<string, Entry>();
  const inflight = new Map<string, Promise<unknown>>();

  const purgeExpired = () => {
    const now = Date.now();
    for (const [k, v] of map) if (v.exp <= now) map.delete(k);
  };

  return {
    async remember(key, ttlMs, fn) {
      const hit = map.get(key);
      if (hit && hit.exp > Date.now()) return hit.value as never;

      // De-duplicate concurrent computes for the same key.
      const pending = inflight.get(key);
      if (pending) return pending as never;

      const p = (async () => {
        try {
          const value = await fn();
          if (map.size >= maxEntries) purgeExpired();
          if (map.size >= maxEntries) {
            // Hard evict: drop the oldest entry.
            const first = map.keys().next().value;
            if (first) map.delete(first);
          }
          map.set(key, { exp: Date.now() + ttlMs, value });
          return value;
        } finally {
          inflight.delete(key);
        }
      })();
      inflight.set(key, p);
      return p as never;
    },

    set(key, ttlMs, value) {
      map.set(key, { exp: Date.now() + ttlMs, value });
    },

    get(key) {
      const hit = map.get(key);
      if (!hit) return undefined;
      if (hit.exp <= Date.now()) {
        map.delete(key);
        return undefined;
      }
      return hit.value as never;
    },
  };
};
