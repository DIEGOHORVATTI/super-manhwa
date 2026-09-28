/**
 * Hand-written service worker (no bundler | robust under Turbopack builds).
 * Goal: the installed app (PWA / Play Store TWA) opens without network.
 *
 * - /_next/static/* → cache-first (hashed, immutable build assets).
 * - navigations     → network-first, falling back to the cached page / the home shell.
 *
 * Narration (/api/tts) and translations already live in the HTTP cache (immutable).
 * Bump VERSION to invalidate everything.
 */
const VERSION = "v2";
const STATIC_CACHE = `sm-static-${VERSION}`;
const PAGE_CACHE = `sm-pages-${VERSION}`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(PAGE_CACHE).then((cache) => cache.add("/").catch(() => {})));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const keep = [STATIC_CACHE, PAGE_CACHE];
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k)));
    })(),
  );
});

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
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

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(STATIC_CACHE, request));
  } else if (request.mode === "navigate") {
    event.respondWith(networkFirst(PAGE_CACHE, request));
  }
});
