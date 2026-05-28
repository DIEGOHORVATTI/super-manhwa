import type { MangaStatus } from "@packages/contracts";

/**
 * Domain entities. There is no persistence layer for manga — these are
 * transient projections of upstream Mangayomi extension responses, shaped into
 * the form our application uses. The opaque `id` is minted by IdStore.
 */

export type MangaSummary = {
  id: string;
  name: string;
  imageUrl?: string;
  lang: string;
  /** Enrichment fields — populated only when the use case ran in enriched mode. */
  status?: MangaStatus;
  genres?: string[];
};

export type Chapter = {
  id: string;
  name: string;
  scanlator?: string;
  /** Unix ms as string (Mangayomi convention). */
  dateUpload?: string;
};

export type MangaDetail = {
  title?: string;
  description?: string;
  author?: string;
  artist?: string;
  genre?: string[];
  status?: MangaStatus;
  imageUrl?: string;
  chapters?: Chapter[];
  /** Source-internal language; kept on the detail for the lang badge on the page. */
  lang: string;
};

export type Paginated<T> = { list: T[]; hasNextPage: boolean };
