import { createMangayomiConnector } from "./mangayomi-factory";

export const mangaworld = createMangayomiConnector({
  id: "mangaworld",
  name: "MangaWorld",
  lang: "it",
  baseUrl: "https://www.mangaworld.cx",
  iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=mangaworld.cx",
  hasCloudflare: false,
  isNsfw: false,
  featured: true,
  source: { kind: "vendored", path: "it/mangaworld.js" },
});
