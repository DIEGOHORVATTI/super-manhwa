import { createMangayomiConnector } from "../shared/mangayomi-factory";

export const asurascans = createMangayomiConnector({
  id: "asurascans",
  name: "Asura Scans",
  lang: "en",
  baseUrl: "https://asuracomic.net",
  iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=asuracomic.net",
  hasCloudflare: true, // routed through FlareSolverr when available
  isNsfw: false,
  featured: true,
  source: { kind: "vendored", path: "en/asurascans.js" },
});
