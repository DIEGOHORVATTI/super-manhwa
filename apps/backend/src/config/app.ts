import packageJson from "../../package.json" with { type: "json" };

/**
 * Static, build-time application metadata. Combined with `env.VERSION` (which
 * also defaults to the package version) it feeds the OpenAPI docs page and the
 * server banner. Mirrors `remarketing/apps/backend/src/config/app.ts`.
 */
export const APP_INFO = {
  name: packageJson.name,
  version: packageJson.version,
  title: "Super Manhwa API",
  description:
    "Catálogo agregado de mangás/manhwas em torno de extensões Mangayomi. " +
    "Wire source-agnostic, ids opacos, imagens via proxy.",
  contact: {
    name: "Super Manhwa API Maintainer",
    email: "supermanhwa@gmail.com",
  },
} as const;
