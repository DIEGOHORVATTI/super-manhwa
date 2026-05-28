import type { Source } from "./source";

/**
 * Raw shapes returned by Mangayomi extensions. The mapper turns these into
 * domain types — callers should never touch these directly outside infra.
 */
export type RawListItem = { name: string; link: string; imageUrl?: string };
export type RawListPage = { list?: RawListItem[]; hasNextPage?: boolean };

export type RawChapter = { name: string; url: string; scanlator?: string; dateUpload?: string };
export type RawDetail = {
  name?: string;
  title?: string;
  description?: string;
  author?: string;
  artist?: string;
  genre?: string[];
  status?: number;
  imageUrl?: string;
  chapters?: RawChapter[];
};

/**
 * The single-source data port. Executes the extension code in a sandbox and
 * returns the raw response shape. Aggregation/dedup/enrichment lives one layer
 * up, in application use cases.
 */
export type MangaCatalog = {
  getPopular(source: Source, page: number): Promise<RawListPage>;
  search(source: Source, query: string, page: number): Promise<RawListPage>;
  getDetail(source: Source, link: string): Promise<RawDetail>;
  getPageList(source: Source, chapterUrl: string): Promise<Array<string | { url: string }>>;
};
