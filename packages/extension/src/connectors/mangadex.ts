import { createMangayomiConnector } from "../shared/mangayomi-factory";

export const mangadex = createMangayomiConnector({
  id: "mangadex",
  name: "MangaDex",
  lang: "en",
  baseUrl: "https://mangadex.org",
  iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=mangadex.org",
  hasCloudflare: false,
  isNsfw: false,
  featured: true,
  hasChapterCount: true,
  source: { kind: "vendored", path: "all/mangadex.js" },
});

/**
 * Same JS bundle as `mangadex` but with the source language pinned to pt-br.
 * The extension reads its language from the source context at run time, so
 * the catalog returns Portuguese titles ("Jogador solo" etc.) for this one.
 */
export const mangadexPtBr = createMangayomiConnector({
  id: "mangadex-ptbr",
  name: "MangaDex (pt-br)",
  lang: "pt-br",
  baseUrl: "https://mangadex.org",
  iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=mangadex.org",
  hasCloudflare: false,
  isNsfw: false,
  featured: true,
  hasChapterCount: true,
  source: { kind: "vendored", path: "all/mangadex.js" },
});
