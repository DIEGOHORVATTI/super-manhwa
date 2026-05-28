import { manga } from "./modules/manga/route";
import { sources } from "./modules/sources/route";

/** The single source of truth — implemented by the backend, consumed by the frontend. */
export const contracts = { sources, manga };

export * from "./modules/sources/schema";
export * from "./modules/manga/schema";
