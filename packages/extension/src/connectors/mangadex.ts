import { createMangayomiConnector } from "../shared/mangayomi-factory";

/**
 * MangaDex serves every language from the same JS bundle | it reads the desired
 * locale from the source context at run time. So it's a single multi-language
 * connector: the fan-out asks for `pt-br` (Portuguese titles/chapters) or `en`
 * (fallback) per request, no duplicate connector per language.
 */
export const mangadex = createMangayomiConnector({
  hasLatestUpdates: true,
  id: "mangadex",
  name: "MangaDex",
  langs: ["pt-br", "en", "es"],
  baseUrl: "https://mangadex.org",
  iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=mangadex.org",
  hasCloudflare: false,
  isNsfw: false,
  featured: true,
  hasChapterCount: true,
  source: { kind: "vendored", path: "all/mangadex.js" },
});
