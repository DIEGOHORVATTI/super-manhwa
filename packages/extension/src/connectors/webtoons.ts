import { createMangayomiConnector } from "./mangayomi-factory";

export const webtoons = createMangayomiConnector({
  id: "webtoons",
  name: "Webtoons",
  lang: "en",
  baseUrl: "https://www.webtoons.com",
  iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=webtoons.com",
  hasCloudflare: false,
  isNsfw: false,
  featured: true,
  source: { kind: "vendored", path: "all/webtoons.js" },
});
