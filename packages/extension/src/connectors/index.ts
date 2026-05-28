// Native pt-br connectors. They're currently `hasCloudflare: true` because
// the upstream sites use WAFs / SPAs that need real-browser execution (see
// `./README.md` for the per-site situation). Registered as typed values so
// the wire is ready when a Puppeteer layer lands; until then they're excluded
// from the popular aggregation pool and act only as fallback targets via
// opaque ids.
import type { MangaConnector } from "../types";
import { asurascans } from "./asurascans";
import { comickPtBr } from "./comick";
import { mangaLivre } from "./manga-livre";
import { mangadex, mangadexPtBr } from "./mangadex";
import { mangafirePtBr } from "./mangafire";
import { mangasYabu } from "./mangas-yabu";
import { mangaworld } from "./mangaworld";
import { manhwaz } from "./manhwaz";
import { tsukiMangas } from "./tsuki-mangas";
import { webtoons } from "./webtoons";
import { weebcentral } from "./weebcentral";

/**
 * Hand-picked, validated connectors we actively aggregate from. Order matters
 * for tie-breaking in the dedupe-by-name aggregator — generic English sources
 * first, locale-specific after.
 *
 * To add a connector:
 *   - Mangayomi-backed → drop a JS file in `javascript/manga/src/<lang>/` and
 *     export a `createMangayomiConnector` value from a new module here.
 *   - Native TypeScript → implement `MangaConnector` directly under
 *     `../native/` (see `../native/README.md` for the contract).
 *
 * The backend imports `CONNECTORS` as a typed value — no `codeUrl` strings,
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
  mangadexPtBr,
  // Mangayomi-backed pt-br aggregators — CF-flagged (out of the popular pool)
  // until validated in a network that reaches their hosts / a vrf that runs
  // under QuickJS. See each connector module for the per-source blocker.
  comickPtBr,
  mangafirePtBr,
  // Native TypeScript (pt-br) — CF-flagged until full-browser bypass lands
  tsukiMangas,
  mangaLivre,
  mangasYabu,
] as const;

/** Build-time map for O(1) lookup by id. */
const byId = new Map<string, MangaConnector>(CONNECTORS.map((c) => [c.id, c]));

export const getCuratedConnector = (id: string): MangaConnector | undefined => byId.get(id);

export { loadMangaExtension, VENDORED_VERSION } from "../shared/load-extension";
export { createMangayomiConnector } from "../shared/mangayomi-factory";
