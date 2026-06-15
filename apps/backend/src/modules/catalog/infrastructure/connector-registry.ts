import { CONNECTORS, type MangaConnector, resolveConnector } from "@packages/extension";

/**
 * Domain port over `@packages/extension`. Application use cases depend on this
 * interface | never on the package directly | so they stay testable with a
 * fake registry.
 *
 * `listCurated()` is the static curated set (validated, vendored). `resolve()`
 * looks up by id; if not curated, it falls back to the upstream Mangayomi
 * index for opaque ids that point at dynamic sources.
 */
export interface ConnectorRegistry {
  listCurated(): readonly MangaConnector[];
  resolve(id: string): Promise<MangaConnector | undefined>;
}

export const makeConnectorRegistry = (): ConnectorRegistry => ({
  listCurated: () => CONNECTORS,
  resolve: (id) => resolveConnector(id),
});
