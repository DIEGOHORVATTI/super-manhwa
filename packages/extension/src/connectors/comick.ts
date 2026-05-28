import { createMangayomiConnector } from "../shared/mangayomi-factory";

/**
 * Comick (pt-br) — Mangayomi-backed, vendored from entityJY.
 *
 * **Status: host migrated + behind Cloudflare.** Investigated via WebFetch:
 *   - `api.comick.fun` (the extension's original host) → connection refused (dead)
 *   - `api.comick.io` → 301 redirect to `comick.dev`
 *   - `comick.dev/v1.0/search` → HTTP 403 (Cloudflare bot-protection; the route
 *     EXISTS — it's not a 404)
 *
 * VENDOR PATCH applied: `apiUrl` repointed to `https://comick.dev`.
 *
 * The 403 is Cloudflare. This connector is `hasCloudflare: true`, so host-fetch
 * routes through FlareSolverr — and the runtime now unwraps the solver's
 * `<pre>{json}</pre>` HTML wrapper back to raw JSON (see `unwrapSolvedBody` in
 * runtime/host.ts), so the extension's `JSON.parse` works on the API response.
 *
 * Still validated only once FlareSolverr can reach comick.dev (needs the
 * container + a non-blocked IP). Stays out of the popular pool until then; once
 * a deploy confirms it works, flip `hasCloudflare` semantics or add a dedicated
 * "needs-solver" flag and bump it into the pool.
 */
export const comickPtBr = createMangayomiConnector({
  id: "comick-ptbr",
  name: "Comick (pt-br)",
  lang: "pt-br",
  baseUrl: "https://comick.io",
  iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=comick.io",
  hasCloudflare: true,
  isNsfw: false,
  featured: false,
  source: { kind: "vendored", path: "all/comick.js" },
  // Comick paginates heavily; give detail/pages a wider window.
  timeouts: { popular: 20_000, search: 20_000, detail: 30_000, pages: 30_000 },
});
