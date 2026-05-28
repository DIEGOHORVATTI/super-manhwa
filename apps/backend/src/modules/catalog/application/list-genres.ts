import type { MangaSummary, Paginated } from "../domain/manga";

/**
 * Genres seen across the enriched popular pool. Derived by triggering an
 * enriched listing (any sort that forces enrichment) and harvesting the
 * `genres` field on each item.
 */
export const makeListGenres =
  (listPopular: (input: { lang?: string; sort: "newest" }) => Promise<Paginated<MangaSummary>>) =>
  async ({ lang }: { lang?: string }): Promise<{ genres: string[] }> => {
    const { list } = await listPopular({ lang, sort: "newest" });
    const seen = new Set<string>();
    for (const m of list) for (const g of m.genres ?? []) seen.add(g);
    return { genres: Array.from(seen).sort((a, b) => a.localeCompare(b)) };
  };
