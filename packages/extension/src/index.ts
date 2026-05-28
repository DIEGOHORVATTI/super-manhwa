/**
 * `@packages/extension` — the single home for everything related to running
 * Mangayomi-format extensions AND our own native TypeScript connectors. The
 * backend consumes this package's typed exports and never reaches for remote
 * URLs or raw JS strings on its own.
 *
 * Public surface:
 *   - `MangaConnector` + raw shapes from `./types`
 *   - `CONNECTORS` array of curated, typed connectors from `./connectors`
 *   - `resolveConnector(id)` for dynamic upstream lookup (`./dynamic`)
 *   - `runExtension` for direct sandbox access (`./runtime`) — usually you
 *     don't need this; you want a `MangaConnector` instead.
 */

export {
  CONNECTORS,
  getCuratedConnector,
  loadMangaExtension,
  VENDORED_VERSION,
} from "./connectors/index";
export { resolveConnector } from "./dynamic";
export { runExtension } from "./runtime/sandbox";
export * from "./types";
