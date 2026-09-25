import "server-only";

import { unstable_cache } from "next/cache";

import type {
  Chapter,
  ChapterSummary,
  Genre,
  Novel,
  NovelPage,
  NovelSort,
  NovelStatus,
  NovelSummary,
} from "./types";

import { SITE_URL, fetchHead, fetchJson, fetchText } from "./http";
import {
  STATUS_FILTER,
  decodeEntities,
  fullSizeCover,
  parseChapterParagraphs,
  parseGenres,
  parseNovel,
  parseNovelList,
  slugFromUrl,
} from "./parse";

export type * from "./types";
export { chapterLabel } from "./parse";

const HOUR = 60 * 60;
const CHAPTERS_PER_PAGE = 100;

type BrowseOptions = {
  sort?: NovelSort;
  genre?: string;
  status?: NovelStatus;
  page?: number;
};

type Category = { id: number; slug: string; name: string; count: number };
type Post = {
  slug: string;
  date: string;
  title: { rendered: string };
  content?: { rendered: string };
  categories?: number[];
};
type AjaxSearch = {
  series?: {
    all?: {
      post_title: string;
      post_link: string;
      post_image?: string;
      post_genres?: string;
      post_status?: string;
    }[];
  }[];
};

export async function browseNovels({
  sort = "popular",
  genre,
  status,
  page = 1,
}: BrowseOptions = {}): Promise<NovelPage> {
  const url = new URL(`${SITE_URL}/series/`);
  url.searchParams.set("order", sort);
  if (genre) url.searchParams.append("genre[]", genre);
  if (status) url.searchParams.set("status", STATUS_FILTER[status]);
  if (page > 1) url.searchParams.set("page", String(page));

  return parseNovelList(await fetchText(url.toString(), { revalidate: HOUR }));
}

export async function searchNovels(query: string, page = 1): Promise<NovelPage> {
  const url = new URL(page > 1 ? `${SITE_URL}/page/${page}/` : `${SITE_URL}/`);
  url.searchParams.set("s", query);

  return parseNovelList(await fetchText(url.toString(), { revalidate: HOUR }));
}

export async function suggestNovels(query: string): Promise<NovelSummary[]> {
  const body = new URLSearchParams({ action: "ts_ac_do_search", ts_ac_query: query });
  const html = await fetchText(`${SITE_URL}/wp-admin/admin-ajax.php`, { method: "POST", body });
  const results = (JSON.parse(html) as AjaxSearch).series?.flatMap((group) => group.all ?? []);

  return (results ?? []).map((result) => ({
    slug: slugFromUrl(result.post_link),
    title: decodeEntities(result.post_title),
    cover: fullSizeCover(result.post_image),
    genres: result.post_genres?.split(",").map((genre) => genre.trim()) ?? [],
  }));
}

export async function getGenres(): Promise<Genre[]> {
  return parseGenres(await fetchText(`${SITE_URL}/series/`, { revalidate: 24 * HOUR }));
}

export const getNovel = unstable_cache(
  async (slug: string): Promise<Novel | null> => {
    const html = await fetchHead(`${SITE_URL}/series/${slug}/`, 'class="bixbox bxcl');
    const novel = parseNovel(slug, html);
    return novel.title ? novel : null;
  },
  ["central-novel", "novel"],
  { revalidate: 6 * HOUR },
);

async function categoryOf(novelSlug: string): Promise<Category | undefined> {
  const { data } = await fetchJson<Category[]>(
    "/wp/v2/categories",
    { slug: novelSlug, _fields: "id,slug,name,count" },
    { revalidate: 24 * HOUR },
  );
  return data[0];
}

function toChapterSummary(post: Post): ChapterSummary {
  return { slug: post.slug, title: decodeEntities(post.title.rendered), date: post.date };
}

export async function getChapters(novelSlug: string): Promise<ChapterSummary[]> {
  const category = await categoryOf(novelSlug);
  if (!category) return [];

  const fetchPage = (page: number) =>
    fetchJson<Post[]>(
      "/wp/v2/posts",
      {
        categories: category.id,
        per_page: CHAPTERS_PER_PAGE,
        page,
        orderby: "date",
        order: "desc",
        _fields: "slug,title,date",
      },
      { revalidate: HOUR },
    );

  const first = await fetchPage(1);
  const rest = await Promise.all(
    Array.from({ length: Math.max(first.totalPages - 1, 0) }, (_, index) => fetchPage(index + 2)),
  );

  return [first, ...rest].flatMap((page) => page.data.map(toChapterSummary));
}

export async function getChapter(slug: string): Promise<Chapter | null> {
  const { data } = await fetchJson<Post[]>(
    "/wp/v2/posts",
    { slug, _fields: "slug,title,date,content,categories" },
    { revalidate: 24 * HOUR },
  );
  const post = data[0];
  if (!post) return null;

  const categoryId = post.categories?.[0];
  const category = categoryId
    ? await fetchJson<Category>(
        `/wp/v2/categories/${categoryId}`,
        { _fields: "slug" },
        { revalidate: 24 * HOUR },
      ).catch(() => null)
    : null;

  return {
    ...toChapterSummary(post),
    novelSlug: category?.data.slug,
    paragraphs: parseChapterParagraphs(post.content?.rendered ?? ""),
  };
}

export function novelUrl(slug: string) {
  return `${SITE_URL}/series/${slug}/`;
}
