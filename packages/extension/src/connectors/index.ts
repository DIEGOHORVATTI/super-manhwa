import type { MangaConnector } from "../types";
import { asurascans } from "./asurascans";
import { mangadex, mangadexPtBr } from "./mangadex";
import { mangaworld } from "./mangaworld";
import { manhwaz } from "./manhwaz";
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
 *     `./native/` (see `native/README.md` for the contract).
 *
 * The backend imports `CONNECTORS` as a typed value — no `codeUrl` strings,
 * no remote fetches at startup.
 */
export const CONNECTORS: readonly MangaConnector[] = [
  mangadex,
  webtoons,
  weebcentral,
  mangaworld,
  manhwaz,
  asurascans,
  mangadexPtBr,
] as const;

/** Build-time map for O(1) lookup by id. */
const byId = new Map<string, MangaConnector>(CONNECTORS.map((c) => [c.id, c]));

export const getCuratedConnector = (id: string): MangaConnector | undefined => byId.get(id);

export { loadMangaExtension, VENDORED_VERSION } from "./load-extension";
export { createMangayomiConnector } from "./mangayomi-factory";
