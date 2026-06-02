import type { ConnectorRegistry } from "../infrastructure/connector-registry";

/**
 * Languages spoken by the curated, non-CF connectors. Used to populate the
 * frontend's lang filter dropdown — the only legitimate UI filter besides
 * genre.
 */
export const makeListLangs =
  (registry: ConnectorRegistry) => async (): Promise<{ langs: string[] }> => {
    const langs = Array.from(
      new Set(
        registry
          .listCurated()
          .filter((c) => !c.hasCloudflare)
          .flatMap((c) => c.langs),
      ),
    )
      .filter(Boolean)
      .sort();
    return { langs };
  };
