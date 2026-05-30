import { createMangayomiConnector } from "../shared/mangayomi-factory";

export const manhwaz = createMangayomiConnector({
  hasLatestUpdates: true,
  id: "manhwaz",
  name: "Manhwaz",
  lang: "en",
  baseUrl: "https://manhwaz.com",
  iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=manhwaz.com",
  hasCloudflare: false,
  isNsfw: false,
  featured: true,
  source: { kind: "vendored", path: "en/manhwaz.js" },
});
