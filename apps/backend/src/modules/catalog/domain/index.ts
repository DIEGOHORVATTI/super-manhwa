// `MangaConnector` is the source-of-truth abstraction for an integration |
// see `@packages/extension`. Re-exported here so the application layer can
// import a single domain barrel.
export type { ConnectorMeta, MangaConnector, RawDetail, RawListPage } from "@packages/extension";
export * from "./manga";
