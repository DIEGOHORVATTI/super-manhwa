/**
 * Shared, in-process image-byte cache for the proxy. Keyed by the opaque token
 * (same token → same upstream URL for every visitor), so a chapter page or cover
 * is fetched from the source CDN once and then served to all sessions from
 * memory | the session/signature check happens upstream in the Next proxy, not
 * here, so caching the bytes is safe and cross-user.
 *
 * Bounded by TOTAL bytes (not entry count) with simple LRU eviction, because
 * images vary wildly in size. Oversized items skip the cache entirely so one
 * huge page can't evict everything. Process-scoped (fine on the persistent
 * Docker backend); swap for Blob/Redis later behind this same port.
 */
export type CachedImage = { body: ArrayBuffer; contentType: string };

export type ImageByteCache = {
  get(key: string): CachedImage | undefined;
  set(key: string, img: CachedImage): void;
};

type Entry = { img: CachedImage; exp: number; size: number };

const MB = 1024 * 1024;

export const makeImageByteCache = ({
  maxBytes = 64 * MB,
  maxItemBytes = 4 * MB,
  ttlMs = 60 * 60 * 1000,
}: {
  maxBytes?: number;
  maxItemBytes?: number;
  ttlMs?: number;
} = {}): ImageByteCache => {
  // Map keeps insertion order → cheap LRU: touch = delete + re-set (newest last),
  // evict from the front (oldest).
  const map = new Map<string, Entry>();
  let total = 0;

  const drop = (key: string) => {
    const e = map.get(key);
    if (!e) return;
    total -= e.size;
    map.delete(key);
  };

  return {
    get(key) {
      const e = map.get(key);
      if (!e) return undefined;
      if (e.exp <= Date.now()) {
        drop(key);
        return undefined;
      }
      // mark most-recently-used
      map.delete(key);
      map.set(key, e);
      return e.img;
    },

    set(key, img) {
      const size = img.body.byteLength;
      if (size > maxItemBytes) return; // too big to be worth caching
      drop(key); // replace any stale entry for this key
      while (total + size > maxBytes && map.size > 0) {
        const oldest = map.keys().next().value;
        if (oldest === undefined) break;
        drop(oldest);
      }
      map.set(key, { img, exp: Date.now() + ttlMs, size });
      total += size;
    },
  };
};
