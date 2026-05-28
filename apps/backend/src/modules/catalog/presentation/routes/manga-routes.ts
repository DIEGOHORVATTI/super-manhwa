import { auth } from "@/context";

import {
  getChapterPages,
  getMangaDetail,
  listGenres,
  listLangs,
  listPopular,
  searchManga,
  suggestManga,
} from "@/container";

/**
 * Wire-level handlers. All routes are `auth`-protected by the shared
 * X-API-KEY — orchestration lives in the application use cases below.
 */
export const listPopularRoute = auth.manga.popular.handler(async ({ input }) => listPopular(input));
export const searchMangaRoute = auth.manga.search.handler(async ({ input }) => searchManga(input));
export const suggestMangaRoute = auth.manga.suggest.handler(async ({ input }) =>
  suggestManga(input),
);
export const getMangaDetailRoute = auth.manga.detail.handler(async ({ input }) =>
  getMangaDetail(input),
);
export const getChapterPagesRoute = auth.manga.pages.handler(async ({ input }) =>
  getChapterPages(input),
);
export const listLangsRoute = auth.manga.langs.handler(async () => listLangs());
export const listGenresRoute = auth.manga.genres.handler(async ({ input }) => listGenres(input));
