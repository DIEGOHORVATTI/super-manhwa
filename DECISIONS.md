# Architectural Decision Records

This file logs the architectural decisions for turning `manga-search-app` into a
Mihon-style web manga reader. Format: lightweight ADR (Michael Nygard style).

Status values: `Proposed` · `Accepted` · `Superseded by ADR-XXXX` · `Deprecated`

---

## ADR-0001 — Reuse the Mangayomi JavaScript extension format (not Kotlin `.apk`)

- **Status:** Accepted (2026-05-27)
- **Context:** Mihon/Tachiyomi sources are distributed as Android `.apk` extensions
  containing Dalvik (DEX) bytecode that calls Android APIs (`Context`,
  `SharedPreferences`) and JVM libraries (OkHttp, Jsoup). Suwayomi-Server proves
  these can only run via a JVM + an Android emulation layer (`AndroidCompat`): "A
  JVM is strictly required." There is no practical way to load DEX/JVM bytecode in
  Node. CheerpJ (JVM-in-WASM) targets pure Java bytecode, not Android, and would
  still need the whole Android stub surface — research-grade, not production.
- **Decision:** Adopt the **Mangayomi JavaScript extension format**
  (`kodjodevf/mangayomi-extensions`). Extensions are plain JS exporting a
  `mangayomiSources` metadata array and a `class DefaultExtension extends MProvider`.
  This is "Tachiyomi extensions rewritten in JS", with a live catalog, and runs in a
  JS engine.
- **Consequences:** (+) 100% JS/TS, no JVM. (+) Existing JS catalog reused.
  (−) Smaller catalog than the full Kotlin ecosystem. (−) We must reimplement the
  Mangayomi host "bridge" in TS (see ADR-0004).

## ADR-0002 — 100% TypeScript monorepo; Bun is the package manager, not a runtime constraint

- **Status:** Accepted (2026-05-27)
- **Context:** Goal is a single TS codebase (frontend + backend + shared packages).
  Bun is used to install/manage dependencies. The actual runtime "underneath" is
  Node/V8 (Vercel executes Node functions), so choosing Bun does **not** force
  JavaScriptCore-specific constraints.
- **Decision:** Monorepo with Bun **workspaces**. Layout: `packages/core` (domain
  types), `packages/extension-runtime` (the bridge), `apps/web` (frontend, currently
  the existing TanStack app at repo root — to be moved later), `apps/server` / Vercel
  functions (backend). Nothing is locked to a Bun-only API.
- **Consequences:** (+) One toolchain, shared types. (+) Runtime stays Node-compatible,
  keeping native-addon and WASM options open. (−) Existing root Vite app must
  eventually move to `apps/web` (deferred to avoid breaking the current Vercel deploy).

## ADR-0003 — Build our own TanStack frontend (not Suwayomi-WebUI)

- **Status:** Accepted (2026-05-27)
- **Context:** Suwayomi-WebUI is a complete web client but is coupled to
  Suwayomi-Server's specific GraphQL schema. Adopting it would force us to implement
  that entire (moving) GraphQL contract on our backend.
- **Decision:** Evolve the existing TanStack Router SPA and expose our **own** thin
  API (REST or a small GraphQL) shaped around the Mangayomi extension contract.
- **Consequences:** (+) We own the API surface; no external schema to chase.
  (−) Less ready-made UI; we build reader/browse/search screens ourselves.

## ADR-0004 — Sandbox extensions with `quickjs-emscripten` (not isolated-vm / vm2)

- **Status:** Accepted (2026-05-27)
- **Context:** Extensions are third-party JS and must be isolated, with controlled
  network egress. The backend must be lightweight and deployable as Vercel serverless
  functions. Candidates: `isolated-vm` (V8 isolates, native C++ addon — viable on
  Node/V8, but native `.node` binaries add deployment friction and weight on
  Vercel/Lambda), `vm2` (deprecated/insecure), `node:vm` (no real isolation),
  `quickjs-emscripten` (QuickJS compiled to WASM).
- **Decision:** Use **`quickjs-emscripten`**. Pure WASM (~1 MB), zero native addon,
  bundles trivially on Vercel, portable across Node/Bun. Strong isolation: the
  extension runs in a separate JS engine with **no network** — all I/O is bridged out
  to host functions (we control egress). Mirrors Tachiyomi/Suwayomi's own use of
  QuickJS. The async host bridge uses the asyncified module variant.
- **Consequences:** (+) Lightweight, serverless-friendly, secure egress.
  (−) Slower than V8 isolates for heavy compute (irrelevant: extensions are I/O +
  light parsing). (−) Async bridging requires care (asyncify + promise resolution).
  The `sandbox` layer is isolated in one module so we can swap to `isolated-vm` later
  if we move to a persistent Node server.
- **Implementation note (validated by the MangaDex spike, 2026-05-27):** the *asyncified*
  QuickJS module does NOT work for real extensions. Asyncify can suspend the VM for
  only ONE host call made before the first VM-level `await`; any host call reached from
  an await-continuation job crashes (`call_indirect signature mismatch`) or hangs
  (`resolvePromise` never settles). Confirmed empirically. **Chosen mechanism instead:**
  the *synchronous* QuickJS module (`getQuickJS`) + a host-driven promise bridge — the VM
  creates a `Promise` per request and calls `__hostFetchStart(id, req)`; the host runs the
  real `fetch()` on its own event loop, then pushes the result back via
  `__resolveFetch(id, raw)` / `__rejectFetch(id, err)` and pumps the VM job queue
  (`executePendingJobs`). Handles unlimited sequential/parallel fetches, stays in-process
  (no workers/subprocesses). The spike ran the unmodified MangaDex extension end-to-end:
  `getPopular(1)` → 20 entries (~860ms), `getDetail` → multi-fetch chapter feed without
  crashing. See `packages/extension-runtime/src/sandbox.ts`.

## ADR-0005 — Cloudflare/anti-bot: MVP excludes CF sources; delegate to an external browser service

- **Status:** Accepted (2026-05-27)
- **Context:** Some sources sit behind Cloudflare JS challenges (Tachiyomi uses a
  WebView). There is no lightweight, reliable way to solve CF inside a Vercel
  serverless function: headless Chromium is heavy (~250 MB, slow cold starts),
  flaresolverr is a persistent Docker service, TLS-fingerprint tools (cycletls) are
  native Go binaries. The Mangayomi source metadata exposes a `hasCloudflare` flag.
- **Decision:** MVP supports **only `hasCloudflare: false` sources** (e.g. MangaDex,
  Comick — JSON APIs / plain HTML). For CF sources later, **delegate** to an external
  on-demand browser service (Browserless / ScrapingBee, or a small Fly.io/Railway
  container running flaresolverr/Playwright), invoked by the Vercel function only when
  the flag requires it.
- **Consequences:** (+) Backend stays genuinely lightweight on Vercel. (+) Heavy/fragile
  CF handling is isolated and optional. (−) CF sources need external (possibly paid)
  infrastructure and are out of MVP scope.

## ADR-0006 — Stateless backend + external KV (Upstash) for session/cookies

- **Status:** Accepted (2026-05-27)
- **Context:** Vercel functions are ephemeral and stateless — no persistent process or
  in-memory cookie jar between requests. The extension HTTP `Client` assumes
  persistent cookies/sessions (incl. any `cf_clearance`).
- **Decision:** Persist per-domain cookies, `cf_clearance`, User-Agent, and response
  caches in an external KV — **Upstash Redis** (or Vercel KV/Edge Config) via the Vercel
  Marketplace. The host `Client` reads/writes the cookie jar there.
- **Consequences:** (+) Sessions survive across stateless invocations. (+) Enables
  response caching to cut upstream calls. (−) Adds an external dependency and a small
  per-request KV round-trip.

## ADR-0007 — Lightweight serverless backend on Vercel, no JVM

- **Status:** Accepted (2026-05-27)
- **Context:** The intent is a "super light" backend instead of a JVM server like
  Suwayomi. Vercel is the target host.
- **Decision:** Backend = Vercel functions (Node runtime) running the TS
  `extension-runtime` (quickjs-emscripten sandbox + host `fetch` via undici/global
  fetch + cheerio for HTML). No JVM, no persistent server in the MVP.
- **Consequences:** (+) Cheap, scales to zero, fast to ship. (−) Stateless (mitigated by
  ADR-0006). (−) Long-running tasks (large library sync) need rethinking under function
  time limits; revisit if needed.

## ADR-0008 — Move the delivery service to a Docker container (amends ADR-0007)

- **Status:** Accepted (2026-05-27)
- **Context:** Running the extension runtime on Vercel serverless forced real
  complexity: WASM bundling (singlefile variant), `.js` ESM import extensions for
  @vercel/node tracing, statelessness (external KV for cookies), function time/size
  limits, and no headless browser for Cloudflare. The philosophy is to **keep zero
  per-source business logic** (the Mangayomi extensions are that logic, run unchanged)
  and focus our code on **architecture**. A persistent server removes the serverless
  friction and can host a real browser for CF.
- **Decision:** Split deployment. **Vercel** hosts the frontend SPA + a thin `/api/*`
  reverse-proxy (`api/[...path].ts`, dual-mode: proxies to `DELIVERY_SERVICE_URL` when
  set, else runs the handler in-process as a fallback). The **delivery service** (the
  extension runtime) runs as a **Docker container** (`Dockerfile`, Bun, no build step)
  on the user's **VPS** via `docker-compose.yml`, alongside a **FlareSolverr** sidecar
  (real headless Chromium) for `hasCloudflare` sources (the app's `FLARESOLVERR_URL`
  points to it). Image is built by GitHub Actions and pushed to **GHCR**
  (`.github/workflows/docker-publish.yml`).
- **Consequences:** (+) No serverless bundling gymnastics; stateful (in-process cookie
  jar/cache, KV optional); Cloudflare solved in-deployment via the sidecar; datacenter-IP
  blocks (e.g. manhwaz) become a controllable egress concern; `isolated-vm` becomes a
  viable future swap. (+) Same code runs locally (`bun dev`) and in the container.
  (−) We now operate a server (no scale-to-zero; ops + cost) and need the VPS reachable
  by the Vercel proxy (set `DELIVERY_SERVICE_URL`). Note: chose a FlareSolverr sidecar
  over baking Playwright into the Bun image — Playwright-under-Bun is fragile, and the
  sidecar is a maintained headless-Chromium service our hook already targets.

## ADR-0009 — Session-bound chapter images; public-signed covers (image protection)

- **Status:** Accepted (2026-05-29)
- **Context:** Cover/page images are proxied through `/api/img/<token>` (opaque,
  AES-encrypted token → upstream URL). Anyone with the URL could open/share it.
  The goal is the WhatsApp model: a copied chapter-page link should not render in
  another browser / incognito. True DRM is impossible (the browser decodes the
  pixels), so the target is "casual link-sharing fails", not "extraction is
  impossible". `next/image` optimization *requires* the optimizer to fetch the
  source server-side, which conflicts with per-session images.
- **Decision:** Split images by sensitivity, and make the **Next `/api/img`
  proxy the protection boundary** (the browser can't reach the Docker backend
  directly — it lacks `X-API-KEY`):
  - **Covers** (not sensitive): the backend appends a permanent HMAC tag
    `?k=HMAC(IMAGE_SIGN_SECRET, "pub:"+token)`. The proxy verifies it and serves
    `public, max-age=1y, immutable` → CDN-cacheable and feedable to `next/image`.
  - **Chapter pages** (sensitive): emitted *without* `k`. The reader RSC signs
    each as `?e=<exp>&s=HMAC(..., "prv:"+token+":"+exp+":"+sid)`, bound to an
    anonymous session id (`mr_sid` cookie, minted by `proxy.ts`). The proxy
    verifies expiry + session and serves `private`. A copied URL dies instantly
    in another browser (different/absent `sid`); expiry is a secondary bound.
  - Signing secret is shared by both layers (`IMAGE_SIGN_SECRET`); the algorithm
    is duplicated in `apps/backend/src/shared/image-sign.ts` and
    `apps/web/lib/image-sign-core.ts`, locked together by a canonical-vector test
    on both sides.
- **Consequences:** (+) Casual sharing broken without real login; covers stay
  fast/cacheable; `next/image` used only where it's safe. (+) No DB — session is
  a random cookie, no PII. (−) Page bytes aren't CDN-shareable cross-user; to
  avoid re-pulling from the source CDN per session the backend keeps a shared,
  byte-bounded in-process cache keyed by token (`image-byte-cache.ts`, LRU, 64 MB
  default) — Blob/Redis can replace it behind the same port for multi-instance
  scale-out. (−) Two implementations of one HMAC must stay in sync (guarded by
  tests). (−) The cover algorithm couples backend↔web.

## ADR-0010 — Caching: drop `force-dynamic`, cache the data layer, not the routes

- **Status:** Accepted (2026-05-29)
- **Context:** Every page was `force-dynamic`, so each navigation did full SSR +
  backend round-trips with no caching — the main scaling bottleneck. Filter pages
  (`/explorar`) and text search explode the cache-key space, so full-route ISR is
  a poor fit; the catalog itself changes slowly (backend caches 5 min–6 h).
- **Decision:** Cache at the **data layer**, keep rendering dynamic. The RSC oRPC
  client wraps `fetch` with `next: { revalidate: 300 }`, so backend calls land in
  Next's Data Cache. `force-dynamic` is removed from home/genre/detail/reader
  (they stay dynamic via `searchParams`/`cookies`, but their fetches are now
  cached/deduped). Reader page URLs are signed *after* the (cacheable) page-list
  fetch, so caching the list is safe. The sitemap revalidates daily (bounded by
  the 5-min fetch cache). Never full-route-cache `/explorar` or search.
- **Consequences:** (+) Backend load drops sharply; TTFB improves; works with the
  session-image model (cookie stays isolated to `/api/img`, never varies HTML).
  (−) Up to 5-min staleness on new chapters (acceptable; tighten later with
  `revalidateTag`). (−) Not full PPR yet — a future step once Cache Components
  stabilizes.

## ADR-0011 — Login-free local persistence (library, continue-reading, read state)

- **Status:** Accepted (2026-05-29)
- **Context:** The app was fully stateless — no favorites, history or read
  markers — yet the privacy stance forbids accounts/PII.
- **Decision:** Persist in **localStorage** only, via `apps/web/lib/library.ts`
  (`useSyncExternalStore` + cross-tab sync). Favorites power `/biblioteca`;
  history powers the home "Continuar lendo" rail; read markers grey out chapters
  and are set when the reader reaches the last page. All consumers are client
  islands, so cached/ISR server pages aren't opted out.
- **Consequences:** (+) Real library UX, zero backend/PII, no cache impact.
  (−) Per-device, no sync (acceptable; a future opt-in account could layer on).

## ADR-0012 — Unified `/explorar` page replaces the "Completos" tab

- **Status:** Accepted (2026-05-29)
- **Context:** Discovery was limited to single-genre pages + home sort tabs; the
  `/manga/search` endpoint existed but was unused (only the header autocomplete).
  "Completos" was just one status, occupying a top-nav slot.
- **Decision:** One discovery page at `/explorar`: text query (→ search) or
  browse (→ popular/trending/newest), refined by genre + status, paginated, with
  all state in the URL. Added a `status` filter through the stack
  (contract → use case → AniList `MediaStatus`). "Completos" becomes a status
  option; the freed nav slot now holds **Explorar** (and **Biblioteca**).
- **Consequences:** (+) Full search + filter UX; `status` reusable elsewhere.
  (−) Status only maps the four AniList-backed states (ongoing/completed/hiatus/
  cancelled).

## ADR-0013 — Optional AniList account sync (favourites), client-side

- **Status:** Accepted (2026-05-29)
- **Context:** Local favourites are per-device (ADR-0011). Users wanted to log in
  and have favourites persist/sync to their AniList account. Crucially, our
  catalog ids **are** AniList media ids, so a favourite maps 1:1 (`Number(id)`).
- **Decision:** Optional, additive sync — no DB, no change to the privacy stance
  (anonymous stays the default). OAuth2 **authorization code grant** (AniList does
  NOT support implicit grant — `response_type=token` is rejected, and its token
  endpoint has no CORS, so the exchange can't run in the browser). Flow: client
  redirects with `response_type=code` → AniList returns to the `/auth/anilist`
  **route handler** (server) → it exchanges the code for a token using the
  server-only `ANILIST_CLIENT_SECRET` → redirects to `/auth/anilist/done#token`
  where the client stores it in localStorage. From there the browser calls
  `graphql.anilist.co` directly (CORS-allowed) with the bearer token. We map our
  library to AniList **Favourites** (`ToggleFavourite` + `User.favourites.manga`)
  — a binary toggle, 1:1 with our button — *not* the status-based MediaList, and
  we deliberately do NOT sync chapter progress (our merged chapter numbering
  doesn't match AniList's). The local store stays the UI source of truth; the
  per-item toggle mirrors to AniList best-effort, and a Biblioteca "Sincronizar"
  action runs a toggle-safe two-way merge (`planFavouritesSync`: pull remote-only,
  push local-only — never re-toggle shared ids). The whole feature is gated on
  `NEXT_PUBLIC_ANILIST_CLIENT_ID`; unset → every AniList affordance is hidden.
- **Consequences:** (+) Real cross-device favourites for those who opt in; no DB;
  trivial id mapping; the client secret stays server-side. (+) Off by default —
  privacy stance intact. (−) Needs a tiny server route for the code exchange (the
  secret + a `/auth/anilist` handler) — not purely client-side. (−) Token still
  lands in localStorage (XSS-exposed; acceptable for a favourites-only scope —
  storing it in an httpOnly cookie + proxying GraphQL is the upgrade path if write
  scope widens). (−) Only Favourites, not reading status/progress. (−) AniList
  covers imported this way are served from AniList's CDN (added to
  `images.remotePatterns`) rather than our signed proxy.

## ADR-0014 — Comments via Disqus (per work + per chapter)

- **Status:** Accepted (2026-05-29)
- **Context:** We wanted discussion on each work and each chapter. AniList has no
  chat and nothing per-chapter (only work-level activity/forum/reviews), so it
  couldn't back this. A first-party comment system would mean a database +
  moderation + anti-spam — a hard break from the stateless/no-DB stance
  (ADR-0006/0008).
- **Decision:** Embed **Disqus**, scoped by a stable identifier per thread:
  `manga-<id>` on the work page (a "Comentários" tab) and `chapter-<id>` on the
  reader. Gated on `NEXT_PUBLIC_DISQUS_SHORTNAME` (unset → hidden). The embed is
  **lazy** (loads only when scrolled near, via IntersectionObserver) and resets
  the thread on client navigation (`DISQUS.reset`) rather than re-injecting.
- **Consequences:** (+) Per-work and per-chapter comments with built-in
  moderation/auth and zero backend/DB on our side; keeps the stateless stance.
  (−) Third-party dependency (Disqus account, its own login, ads on the free
  tier, external privacy/data). (−) Limited theming (Disqus controls its iframe
  styling). An eventual first-party system (DB + AniList login as identity) is
  the upgrade path if the external dependency becomes a problem.

---

### Bridge reference (for ADR-0004 implementation)

Authoritative source of the contract we reimplement: the Dart runtime at
`kodjodevf/mangayomi/lib/eval/javascript/` — `service.dart` (MProvider base + global
injection), `http.dart` (`Client`/`Response`), `dom_selector.dart` (`Document`/`Element`
≈ Jsoup → map to **cheerio** + `xpath`), `utils.dart` (`substring*` String helpers;
crypto: `unpackJs`/JSPacker, AES via CryptoJS, `cryptoHandler`), `preferences.dart`
(`SharedPreferences`/`getPreference`).

Extension contract (methods `MProvider` subclasses implement): `getPopular(page)`,
`getLatestUpdates(page)`, `search(query, page, filters)`, `getDetail(url)`,
`getPageList(url)`, `getFilterList()`, `getSourcePreferences()` (+ `getVideoList(url)`
for anime).

## ADR-0015 — Novel-only catalog read straight from Central Novel

- **Status:** Accepted (2026-09-25). Supersedes ADR-0001, ADR-0002 (backend part), ADR-0004 and
  the favourites part of ADR-0013.
- **Context:** The multi-source manga catalog (a separate oRPC backend on Railway running
  Mangayomi-style extensions, AES ids, signed image proxy, DB catalog cache, FlareSolverr) cost
  more to run and debug than it returned. The product is now focused on novels, and Central Novel
  exposes everything needed: wp-json for chapters and text (CORS open), and a Themesia listing /
  search HTML with covers and filters.
- **Decision:** Drop `apps/backend`, `packages/extension` and `packages/core`. `apps/web` reads the
  catalog directly (`lib/catalog`), cached by Next's fetch cache. Works and chapters are identified
  by Central Novel slugs. The reader narrates chapters with Web Speech, one consistent voice per
  character (`lib/player`). Catalog, reader and library pages move to MUI (scale theme).
- **Consequences:** (+) One deployable (Vercel), no shared secrets between services, far less code.
  (+) Stable, human-readable ids. (−) A single source: if Central Novel changes its theme markup,
  `lib/catalog/parse.ts` must follow (its tests pin the expected markup). (−) Library/progress
  entries saved with old ids are dropped. (−) The unused `cached_*` tables stay until a drop
  migration is approved.
