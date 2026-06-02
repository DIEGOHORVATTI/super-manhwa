/**
 * Public typed surface of `@packages/extension`. The backend consumes ONLY
 * these types — `codeUrl` strings and remote fetches are private to the
 * package. Native connectors implement `MangaConnector` directly; Mangayomi
 * JS-backed connectors are produced by `createMangayomiConnector()` which
 * adapts the QuickJS runner to the same interface.
 */

/** Static metadata describing how a connector identifies and behaves. */
export interface ConnectorMeta {
  id: string;
  name: string;
  /** ISO-639 language codes the source can serve (e.g. `["en", "pt-br"]`).
   *  The first entry is the default when a request doesn't pin a language. */
  langs: string[];
  /** Used as Referer when fetching cover/page bytes through the image proxy. */
  baseUrl: string;
  iconUrl: string;
  /** When true, the source sits behind Cloudflare and needs FlareSolverr. */
  hasCloudflare: boolean;
  isNsfw: boolean;
  /** Hint for the UI — featured sources show in the curated section. */
  featured?: boolean;
}

/* ----- Raw shapes ----- */
/* Mangayomi extensions and our native connectors both speak this shape; the
 * backend maps it to its own domain types (opaque ids, proxied images). */

export interface RawListItem {
  name: string;
  link: string;
  imageUrl?: string;
}

export interface RawListPage {
  list?: RawListItem[];
  hasNextPage?: boolean;
}

export interface RawChapter {
  name: string;
  url: string;
  scanlator?: string;
  /** Unix milliseconds as string (Mangayomi convention). */
  dateUpload?: string;
}

export interface RawDetail {
  /** Mangayomi extensions vary — some use `name`, others `title`, some omit. */
  name?: string;
  title?: string;
  description?: string;
  author?: string;
  artist?: string;
  genre?: string[];
  /** 0=ongoing, 1=completed, 2=hiatus, 3=cancelled, 4=publishing-finished. */
  status?: number;
  imageUrl?: string;
  chapters?: RawChapter[];
}

/** Mangayomi extensions return either a string URL or `{url}` per page. */
export type RawPage = string | { url: string };

/** The full connector contract — what the backend consumes. */
export interface MangaConnector extends ConnectorMeta {
  // `lang` (optional, last arg) picks which of the connector's `langs` to serve;
  // multi-language sources honor it, single-language ones ignore it.
  getPopular(page: number, lang?: string): Promise<RawListPage>;
  search(query: string, page: number, lang?: string): Promise<RawListPage>;
  getDetail(link: string, lang?: string): Promise<RawDetail>;
  getPageList(chapterUrl: string): Promise<RawPage[]>;
  /**
   * Optional fast chapter-count probe for annotating listings without a full
   * `getDetail` (e.g. MangaDex `/aggregate`). Sources that can't answer cheaply
   * omit it — callers must feature-detect.
   */
  getChapterCount?(link: string, lang?: string): Promise<number>;
  /**
   * Optional "recently updated" listing (works with a fresh chapter), paginated.
   * Most Mangayomi bundles implement it; native connectors may not — callers
   * must feature-detect.
   */
  getLatestUpdates?(page: number, lang?: string): Promise<RawListPage>;
}
