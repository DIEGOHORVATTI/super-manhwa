import type { MangaStatus } from "@packages/contracts";
import { httpFetch } from "@/shared/http-fetch";

import type {
  CatalogItem,
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

// Shared media projection — every list/detail query selects the same fields.
const MEDIA_FIELDS = `
  id
  title { romaji english native userPreferred }
  coverImage { large }
  genres
  averageScore
  status
  chapters
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
  chapters?: number | null;
  bannerImage?: string | null;
  description?: string | null;
  synonyms?: Array<string | null>;
}

interface PageResponse {
  data?: { Page?: { media?: MediaNode[] | null } | null };
}
interface MediaResponse {
  data?: { Media?: MediaNode | null };
}
interface GenreResponse {
  data?: { GenreCollection?: Array<string | null> | null };
}

/** English-first display title — the app shows works under their English name. */
const displayTitle = (m: MediaNode): string =>
  m.title?.english ?? m.title?.romaji ?? m.title?.userPreferred ?? m.title?.native ?? `#${m.id}`;

const toItem = (m: MediaNode): CatalogItem => ({
  id: String(m.id),
  title: displayTitle(m),
  imageUrl: m.coverImage?.large ?? undefined,
  status: m.status ? STATUS_MAP[m.status] : undefined,
  genres: (m.genres ?? []).filter((g): g is string => !!g),
  score: m.averageScore ?? undefined,
  chapters: m.chapters ?? undefined,
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

const SEARCH_QUERY = `query ($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(type: MANGA, search: $search, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} }
  }
}`;

/** Build a paginated browse query for a sort/genre combination. */
const buildListQuery = (
  sort: CatalogSort,
  genre?: string,
): { query: string; vars: Record<string, unknown> } => {
  const filters = [`sort: ${SORT_BY[sort]}`];
  const decls = ["$page: Int", "$perPage: Int"];
  if (sort === "completed") filters.push("status: FINISHED");
  if (sort === "newest") filters.push("status_not: NOT_YET_RELEASED");
  if (genre) {
    filters.push("genre: $genre");
    decls.push("$genre: String");
  }
  const query = `query (${decls.join(", ")}) {
    Page(page: $page, perPage: $perPage) {
      media(type: MANGA, ${filters.join(", ")}) { ${MEDIA_FIELDS} }
    }
  }`;
  return { query, vars: genre ? { genre } : {} };
};

const DETAIL_QUERY = `query ($id: Int) {
  Media(id: $id, type: MANGA) {
    ${MEDIA_FIELDS}
    bannerImage
    description(asHtml: false)
    synonyms
  }
}`;

const listFrom = async (
  query: string,
  variables: Record<string, unknown>,
): Promise<CatalogItem[]> => {
  const res = await post<PageResponse>(query, variables);
  return (res?.data?.Page?.media ?? []).map(toItem);
};

/**
 * AniList-backed catalog. Public GraphQL, no key. One consistent catalog of works
 * keyed by AniList id; reading sources are matched later by title/aliases.
 */
export const makeAniListCatalog = (): CatalogSource => ({
  search: (query, page) => listFrom(SEARCH_QUERY, { search: query, page, perPage: PER_PAGE }),

  list: ({ sort, genre, page }) => {
    const { query, vars } = buildListQuery(sort, genre);
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
