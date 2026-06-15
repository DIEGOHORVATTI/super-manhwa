import { createMangayomiConnector } from "../shared/mangayomi-factory";

export const webtoons = createMangayomiConnector({
  hasLatestUpdates: true,
  id: "webtoons",
  name: "Webtoons",
  langs: ["en", "es"],
  baseUrl: "https://www.webtoons.com",
  iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=webtoons.com",
  hasCloudflare: false,
  isNsfw: false,
  featured: true,
  source: { kind: "vendored", path: "all/webtoons.js" },
});
