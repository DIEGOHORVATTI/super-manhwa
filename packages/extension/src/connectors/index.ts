// pt-br native connectors (Comick, Mangafire) are `hasCloudflare: true`: kept
// out of the popular pool so the home feed stays clean, but fully functional as
// detail/fallback targets by opaque id (Comick → 365 ch, Mangafire → 201 ch).
import type { MangaConnector } from "../types";
import { asurascans } from "./asurascans";
import { comickPtBr } from "./comick";
import { mangadex } from "./mangadex";
import { mangafirePtBr } from "./mangafire";
import { mangaLivreBlog, mangaLivreTo } from "./mangalivre";
import { mangaworld } from "./mangaworld";
import { manhwaz } from "./manhwaz";
import { webtoons } from "./webtoons";
import { weebcentral } from "./weebcentral";

/**
 * Hand-picked, validated connectors we actively aggregate from. Order matters
 * for tie-breaking in the dedupe-by-name aggregator | generic English sources
 * first, locale-specific after.
 *
 * To add a connector:
 *   - Mangayomi-backed → drop a JS file in `javascript/manga/src/<lang>/` and
 *     export a `createMangayomiConnector` value from a new module here.
 *   - Native TypeScript → implement `MangaConnector` directly under
 *     `../native/` (see `../native/README.md` for the contract).
 *
 * The backend imports `CONNECTORS` as a typed value | no `codeUrl` strings,
 * no remote fetches at startup.
 */
export const CONNECTORS: readonly MangaConnector[] = [
  // Mangayomi-backed, vendored from m2k3a/mangayomi-extensions
  mangadex,
  webtoons,
  weebcentral,
  mangaworld,
  manhwaz,
  asurascans,
  // Native pt-br connectors scraped from the two Manga Livre sites
  // (mangalivre.to = Madara, mangalivre.blog = custom theme). No Cloudflare.
  mangaLivreTo,
  mangaLivreBlog,
  // Mangayomi-backed pt-br aggregators | CF-flagged (out of the popular pool)
  // until validated in a network that reaches their hosts / a vrf that runs
  // under QuickJS. See each connector module for the per-source blocker.
  comickPtBr,
  mangafirePtBr,
] as const;

/** Build-time map for O(1) lookup by id. */
const byId = new Map<string, MangaConnector>(CONNECTORS.map((c) => [c.id, c]));

export const getCuratedConnector = (id: string): MangaConnector | undefined => byId.get(id);

export { loadMangaExtension, VENDORED_VERSION } from "../shared/load-extension";
export { createMangayomiConnector } from "../shared/mangayomi-factory";
