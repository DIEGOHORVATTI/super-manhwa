import type { SourceRegistry } from "../domain/source";

/**
 * Languages spoken by the curated, non-CF integrations. Used to populate the
 * frontend's lang filter dropdown — the only legitimate UI filter besides genre.
 */
export const makeListLangs =
  (registry: SourceRegistry) => async (): Promise<{ langs: string[] }> => {
    const langs = Array.from(
      new Set(
        registry
          .listCurated()
          .filter((s) => !s.hasCloudflare)
          .map((s) => s.lang),
      ),
    )
      .filter(Boolean)
      .sort();
    return { langs };
  };
