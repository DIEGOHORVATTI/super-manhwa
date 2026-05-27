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
