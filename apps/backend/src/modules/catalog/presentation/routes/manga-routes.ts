import { implement } from "@orpc/server";
import { contracts } from "@packages/contracts";

import {
  getChapterPages, getMangaDetail, listGenres, listLangs,
  listPopular, searchManga, suggestManga,
} from "@/container";

const os = implement(contracts);

/**
 * Wire-level handlers. Each one is a one-liner — the orchestration lives in the
 * application use cases. This file's only job is to bind the contract methods
 * to the container's pre-wired use case instances.
 */
export const listPopularRoute = os.manga.popular.handler(async ({ input }) => listPopular(input));
export const searchMangaRoute = os.manga.search.handler(async ({ input }) => searchManga(input));
export const suggestMangaRoute = os.manga.suggest.handler(async ({ input }) => suggestManga(input));
export const getMangaDetailRoute = os.manga.detail.handler(async ({ input }) => getMangaDetail(input));
export const getChapterPagesRoute = os.manga.pages.handler(async ({ input }) => getChapterPages(input));
export const listLangsRoute = os.manga.langs.handler(async () => listLangs());
export const listGenresRoute = os.manga.genres.handler(async ({ input }) => listGenres(input));
