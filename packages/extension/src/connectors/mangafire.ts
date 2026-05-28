import { createMangayomiConnector } from "../shared/mangayomi-factory";

/**
 * Mangafire (pt-br) — Mangayomi-backed, vendored from entityJY.
 *
 * **Status: partially working.** `getPopular` works against `mangafire.to`.
 * `search` and `getDetail` both depend on `generate_vrf` — Mangafire's
 * anti-bot request signing — which throws inside our QuickJS runtime
 * ("cannot read property 'value' of undefined"). Two vendor patches are
 * already applied to the JS (default `viewType`, fix the empty-filters guard);
 * the remaining blocker is the vrf crypto itself, which is deliberately
 * obfuscated and brittle across JS engines.
 *
 * Kept `hasCloudflare: true` so it stays OUT of the popular pool — a source
 * whose detail page can't load is worse than absent. Revisit if the vrf is
 * ported to work under QuickJS, or run it through a full-browser bypass.
 */
export const mangafirePtBr = createMangayomiConnector({
  id: "mangafire-ptbr",
  name: "Mangafire (pt-br)",
  lang: "pt-br",
  baseUrl: "https://mangafire.to",
  iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=mangafire.to",
  hasCloudflare: true,
  isNsfw: false,
  featured: false,
  source: { kind: "vendored", path: "all/mangafire.js" },
});
