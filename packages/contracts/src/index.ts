import { manga } from "./modules/manga/route.js";
import { sources } from "./modules/sources/route.js";

/** The single source of truth — implemented by the backend, consumed by the frontend. */
export const contracts = { sources, manga };

export * from "./modules/sources/schema.js";
export * from "./modules/manga/schema.js";
