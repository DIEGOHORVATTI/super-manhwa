import { createMangayomiConnector } from "../shared/mangayomi-factory";

export const mangaworld = createMangayomiConnector({
  hasLatestUpdates: true,
  id: "mangaworld",
  name: "MangaWorld",
  lang: "it",
  baseUrl: "https://www.mangaworld.mx",
  iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=mangaworld.mx",
  hasCloudflare: false,
  isNsfw: false,
  featured: true,
  source: { kind: "vendored", path: "it/mangaworld.js" },
});
