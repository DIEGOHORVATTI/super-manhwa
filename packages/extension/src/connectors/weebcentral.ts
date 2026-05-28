import { createMangayomiConnector } from "./mangayomi-factory";

export const weebcentral = createMangayomiConnector({
  id: "weebcentral",
  name: "Weeb Central",
  lang: "en",
  baseUrl: "https://weebcentral.com",
  iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=weebcentral.com",
  hasCloudflare: false,
  isNsfw: false,
  featured: true,
  source: { kind: "vendored", path: "en/weebcentral.js" },
});
