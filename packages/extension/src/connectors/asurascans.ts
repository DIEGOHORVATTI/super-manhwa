import { createMangayomiConnector } from "../shared/mangayomi-factory";

export const asurascans = createMangayomiConnector({
  hasLatestUpdates: true,
  id: "asurascans",
  name: "Asura Scans",
  langs: ["en"],
  baseUrl: "https://asurascans.com",
  iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=asurascans.com",
  hasCloudflare: true, // routed through FlareSolverr when available
  isNsfw: false,
  featured: true,
  source: { kind: "vendored", path: "en/asurascans.js" },
});
