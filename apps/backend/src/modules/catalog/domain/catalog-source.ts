import type { MangaStatus } from "@packages/contracts";

/**
 * Discovery/catalog port. The catalog (listing, search, suggest, genres, and a
 * work's canonical identity) is sourced from a metadata DB (AniList) rather than
 * the reading connectors — one consistent catalog with stable ids, titles, covers
 * and genres. The reading connectors are only consulted later, to resolve the
 * actual chapters/pages for a work (see get-manga-detail).
 *
 * `id` is the canonical work id (AniList id as a string). Image URLs are raw
 * upstream here; the application layer proxies them like covers/pages.
 */
export type CatalogItem = {
  id: string;
  title: string;
  imageUrl?: string;
  status?: MangaStatus;
  genres?: string[];
  score?: number;
  /** Total chapter count when the catalog knows it (often null while ongoing). */
  chapters?: number;
};

/** A work's full catalog record — drives the detail page's non-chapter content. */
export type CatalogWork = CatalogItem & {
  description?: string;
  bannerImage?: string;
  /** Title variants (english/romaji/native/synonyms) for matching reading sources. */
  aliases: string[];
};

/** Listing modes: `trending` (home default), all-time `popular`, `newest`, `completed`. */
export type CatalogSort = "trending" | "popular" | "newest" | "completed";

/** A page of catalog items plus whether the source has a further page. */
export type CatalogPage = {
  items: CatalogItem[];
  hasNextPage: boolean;
};

export type CatalogSource = {
  /** Free-text search, paginated. */
  search(query: string, page: number): Promise<CatalogPage>;
  /** Browse listing by sort, optionally constrained to a genre. */
  list(opts: { sort: CatalogSort; genre?: string; page: number }): Promise<CatalogPage>;
  /** Full record by canonical id, or null if unknown. */
  byId(id: string): Promise<CatalogWork | null>;
  /** The catalog's genre vocabulary. */
  genres(): Promise<string[]>;
};
