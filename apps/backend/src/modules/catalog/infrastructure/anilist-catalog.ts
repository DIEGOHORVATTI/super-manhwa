import type { MangaStatus, WorkFormat } from "@packages/contracts";
import { httpFetch } from "@/shared/http-fetch";

import type {
  CatalogItem,
  CatalogPage,
  CatalogSort,
  CatalogSource,
  CatalogWork,
} from "../domain/catalog-source";

const ENDPOINT = "https://graphql.anilist.co";
const PER_PAGE = 30;

const STATUS_MAP: Record<string, MangaStatus> = {
  RELEASING: "ongoing",
  FINISHED: "completed",
  HIATUS: "hiatus",
  CANCELLED: "cancelled",
  NOT_YET_RELEASED: "unknown",
};

// Shared media projection | every list/detail query selects the same fields.
const MEDIA_FIELDS = `
  id
  title { romaji english native userPreferred }
  coverImage { large }
  genres
  averageScore
  status
  format
  chapters
  description(asHtml: false)
`;

interface MediaNode {
  id: number;
  title?: {
    romaji?: string | null;
    english?: string | null;
    native?: string | null;
    userPreferred?: string | null;
  };
  coverImage?: { large?: string | null };
  genres?: Array<string | null>;
  averageScore?: number | null;
  status?: string | null;
  format?: string | null;
  chapters?: number | null;
  bannerImage?: string | null;
  description?: string | null;
  synonyms?: Array<string | null>;
}

interface PageResponse {
  data?: {
    Page?: {
      pageInfo?: { hasNextPage?: boolean | null } | null;
      media?: MediaNode[] | null;
    } | null;
  };
}
interface MediaResponse {
  data?: { Media?: MediaNode | null };
}
interface GenreResponse {
  data?: { GenreCollection?: Array<string | null> | null };
}

/** English-first display title | the app shows works under their English name. */
const displayTitle = (m: MediaNode): string =>
  m.title?.english ?? m.title?.romaji ?? m.title?.userPreferred ?? m.title?.native ?? `#${m.id}`;

/** Short plain-text teaser for listing hover (strips tags/newlines, clamps). */
const shortDesc = (raw?: string | null): string | undefined => {
  if (!raw) return undefined;
  const text = raw
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return undefined;
  return text.length > 220 ? `${text.slice(0, 220).trimEnd()}…` : text;
};

const toItem = (m: MediaNode): CatalogItem => ({
  id: String(m.id),
  title: displayTitle(m),
  imageUrl: m.coverImage?.large ?? undefined,
  status: m.status ? STATUS_MAP[m.status] : undefined,
  genres: (m.genres ?? []).filter((g): g is string => !!g),
  score: m.averageScore ?? undefined,
  // AniList only distinguishes NOVEL; everything else reads as paginated manga.
  format: m.format === "NOVEL" ? "novel" : undefined,
  chapters: m.chapters ?? undefined,
  description: shortDesc(m.description),
});

const post = async <T>(query: string, variables: Record<string, unknown>): Promise<T | null> => {
  const r = await httpFetch<T>(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return r.error ? null : r.value;
};

const SORT_BY: Record<CatalogSort, string> = {
  trending: "TRENDING_DESC",
  popular: "POPULARITY_DESC",
  newest: "START_DATE_DESC",
  completed: "POPULARITY_DESC",
};

/** Our status filter → AniList `MediaStatus`. Unmapped values (publishing-finished,
 *  unknown) impose no filter. */
const ANILIST_STATUS: Partial<Record<MangaStatus, string>> = {
  ongoing: "RELEASING",
  completed: "FINISHED",
  hiatus: "HIATUS",
  cancelled: "CANCELLED",
};

/** Resolve the effective AniList status filter: an explicit one wins; otherwise
 *  the `completed` sort implies FINISHED. */
const statusFilterFor = (sort: CatalogSort, status?: MangaStatus): string | undefined => {
  if (status && ANILIST_STATUS[status]) return ANILIST_STATUS[status];
  if (sort === "completed") return "FINISHED";
  return undefined;
};

/** Build a paginated browse query for a sort/genre/status/format combination. */
const buildListQuery = (
  sort: CatalogSort,
  genre?: string,
  status?: MangaStatus,
  format?: WorkFormat,
): { query: string; vars: Record<string, unknown> } => {
  const filters = [`sort: ${SORT_BY[sort]}`];
  const decls = ["$page: Int", "$perPage: Int"];
  const statusFilter = statusFilterFor(sort, status);
  if (statusFilter) filters.push(`status: ${statusFilter}`);
  else if (sort === "newest") filters.push("status_not: NOT_YET_RELEASED");
  // AniList groups light novels under type MANGA, tagged format NOVEL. A `novel`
  // filter keeps only those; any image format (manga/manhwa/manhua) excludes them.
  if (format === "novel") filters.push("format: NOVEL");
  else if (format) filters.push("format_not: NOVEL");
  if (genre) {
    filters.push("genre: $genre");
    decls.push("$genre: String");
  }
  const query = `query (${decls.join(", ")}) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage }
      media(type: MANGA, ${filters.join(", ")}) { ${MEDIA_FIELDS} }
    }
  }`;
  return { query, vars: genre ? { genre } : {} };
};

/** Build a search query, optionally constrained by genre/status. */
const buildSearchQuery = (
  genre?: string,
  status?: MangaStatus,
): { query: string; vars: Record<string, unknown> } => {
  const filters = ["search: $search", "sort: SEARCH_MATCH"];
  const decls = ["$search: String", "$page: Int", "$perPage: Int"];
  const statusFilter = status && ANILIST_STATUS[status];
  if (statusFilter) filters.push(`status: ${statusFilter}`);
  if (genre) {
    filters.push("genre: $genre");
    decls.push("$genre: String");
  }
  const query = `query (${decls.join(", ")}) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage }
      media(type: MANGA, ${filters.join(", ")}) { ${MEDIA_FIELDS} }
    }
  }`;
  return { query, vars: genre ? { genre } : {} };
};

const DETAIL_QUERY = `query ($id: Int) {
  Media(id: $id, type: MANGA) {
    ${MEDIA_FIELDS}
    bannerImage
    synonyms
  }
}`;

const listFrom = async (
  query: string,
  variables: Record<string, unknown>,
): Promise<CatalogPage> => {
  const res = await post<PageResponse>(query, variables);
  const page = res?.data?.Page;
  return {
    items: (page?.media ?? []).map(toItem),
    hasNextPage: page?.pageInfo?.hasNextPage ?? false,
  };
};

/**
 * AniList-backed catalog. Public GraphQL, no key. One consistent catalog of works
 * keyed by AniList id; reading sources are matched later by title/aliases.
 */
export const makeAniListCatalog = (): CatalogSource => ({
  search: (query, page, filters) => {
    const { query: gql, vars } = buildSearchQuery(filters?.genre, filters?.status);
    return listFrom(gql, { ...vars, search: query, page, perPage: PER_PAGE });
  },

  list: ({ sort, genre, status, format, page }) => {
    const { query, vars } = buildListQuery(sort, genre, status, format);
    return listFrom(query, { ...vars, page, perPage: PER_PAGE });
  },

  async byId(id) {
    const numeric = Number.parseInt(id, 10);
    if (!Number.isFinite(numeric)) return null;
    const res = await post<MediaResponse>(DETAIL_QUERY, { id: numeric });
    const m = res?.data?.Media;
    if (!m) return null;
    const aliases = [
      m.title?.english,
      m.title?.romaji,
      m.title?.native,
      ...(m.synonyms ?? []),
    ].filter((s): s is string => typeof s === "string" && s.trim().length > 0);
    const work: CatalogWork = {
      ...toItem(m),
      description: m.description ?? undefined,
      bannerImage: m.bannerImage ?? undefined,
      aliases: Array.from(new Set(aliases)),
    };
    return work;
  },

  async genres() {
    const res = await post<GenreResponse>("{ GenreCollection }", {});
    return (res?.data?.GenreCollection ?? []).filter((g): g is string => !!g);
  },
});
