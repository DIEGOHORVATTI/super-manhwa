/**
 * Domain types shared across the manga app — modeled on the Mangayomi extension
 * contract (see DECISIONS.md, ADR-0001 / ADR-0004). These are the shapes that
 * extension methods produce and the rest of the app consumes.
 */

export enum ItemType {
  Manga = 0,
  Anime = 1,
  Novel = 2,
}

export enum MangaStatus {
  Ongoing = 0,
  Completed = 1,
  Hiatus = 2,
  Cancelled = 3,
  PublishingFinished = 4,
  Unknown = 5,
}

/** Source metadata as declared by an extension's `mangayomiSources` entry. */
export interface SourceMeta {
  name: string;
  baseUrl: string;
  /** Optional API base; many sources hit a separate API host. */
  apiUrl?: string;
  /** Single resolved language for this source instance (e.g. "en", "pt-br"). */
  lang: string;
  iconUrl?: string;
  version?: string;
  itemType?: ItemType;
  isNsfw?: boolean;
  hasCloudflare?: boolean;
  /** Allow source-specific extra fields without losing type-safety elsewhere. */
  [key: string]: unknown;
}

/** A manga entry in a browse/search results page. */
export interface MangaEntry {
  name: string;
  /** Path/URL identifying the manga within the source (often domain-less). */
  link: string;
  imageUrl?: string;
}

/** Return shape of getPopular / getLatestUpdates / search. */
export interface MangasPage {
  list: MangaEntry[];
  hasNextPage: boolean;
}

export interface Chapter {
  name: string;
  url: string;
  scanlator?: string;
  /** Milliseconds since epoch, as a string (per Mangayomi contract). */
  dateUpload?: string;
}

/** Return shape of getDetail. */
export interface MangaDetail {
  title?: string;
  description?: string;
  author?: string;
  genre?: string[];
  status?: MangaStatus | number;
  imageUrl?: string;
  chapters?: Chapter[];
}

/** A page returned by getPageList: either a bare URL or URL + headers. */
export type PageList = Array<string | { url: string; headers?: Record<string, string> }>;

/** The methods an extension (subclass of MProvider) may implement. */
export type ExtensionMethod =
  | "getPopular"
  | "getLatestUpdates"
  | "search"
  | "getDetail"
  | "getPageList"
  | "getFilterList"
  | "getSourcePreferences";
