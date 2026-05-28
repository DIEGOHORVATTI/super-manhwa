/**
 * Rich metadata for a work — a discovery layer on top of the reading sources.
 * Sourced from an external metadata DB (AniList), keyed by title. Image URLs
 * are raw upstream here; the application layer proxies them like covers/pages.
 */

export type MetaCharacter = {
  name: string;
  role?: string;
  imageUrl?: string;
};

export type MetaRelation = {
  relation: string;
  title: string;
};

export type MangaMeta = {
  score?: number;
  bannerImage?: string;
  tags: string[];
  characters: MetaCharacter[];
  relations: MetaRelation[];
  description?: string;
};

/** Port for a metadata provider (AniList, MAL, …). Keyed by free-text title. */
export type MetadataProvider = {
  /** Returns null when the title isn't found (caller renders the page without it). */
  byTitle(title: string): Promise<MangaMeta | null>;
};
