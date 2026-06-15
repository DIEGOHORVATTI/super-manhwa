import * as mangaRoutes from "@/modules/catalog/presentation/routes/manga-routes";
import * as systemRoutes from "@/modules/system/presentation/routes/system-routes";

/**
 * The oRPC router tree. Shape mirrors the contracts router so the implementer
 * type-checks against the contract. Image proxying is NOT here | it's a raw
 * binary route handled directly as a customHandler in `index.ts`.
 */
export const router = {
  health: systemRoutes.getHealthRoute,
  manga: {
    popular: mangaRoutes.listPopularRoute,
    latest: mangaRoutes.listLatestRoute,
    search: mangaRoutes.searchMangaRoute,
    suggest: mangaRoutes.suggestMangaRoute,
    core: mangaRoutes.getMangaCoreRoute,
    chapters: mangaRoutes.getMangaChaptersRoute,
    pages: mangaRoutes.getChapterPagesRoute,
    langs: mangaRoutes.listLangsRoute,
    genres: mangaRoutes.listGenresRoute,
    meta: mangaRoutes.getMangaMetaRoute,
    characters: mangaRoutes.getMangaCharactersRoute,
  },
};
