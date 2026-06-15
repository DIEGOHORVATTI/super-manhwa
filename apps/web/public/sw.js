/**
 * Hand-written service worker (no bundler | robust under Turbopack builds).
 * Goals: serve cached covers + downloaded chapter pages offline, and keep
 * recently visited pages available when the network drops.
 *
 * - /api/img/*  → cache-first (covers + pages the reader pre-downloaded into the
 *   same `mr-images-v1` cache; see DownloadChapterButton).
 * - navigations → network-first, falling back to cache / the home shell.
 *
 * Bump the cache suffix to invalidate everything.
 */
const IMG_CACHE = "mr-images-v1";
const PAGE_CACHE = "mr-pages-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.endsWith("-v1")).map((k) => caches.delete(k)));
    })(),
  );
});

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return hit || Response.error();
  }
}

async function networkFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return (await cache.match(request)) || (await cache.match("/")) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/img/")) {
    event.respondWith(cacheFirst(IMG_CACHE, request));
  } else if (request.mode === "navigate") {
    event.respondWith(networkFirst(PAGE_CACHE, request));
  }
});
