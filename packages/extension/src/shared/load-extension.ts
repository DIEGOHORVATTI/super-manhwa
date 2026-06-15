import path from "node:path";

/** Filesystem root for vendored `javascript/manga/src/<lang>/<name>.js`. */
const MANGA_ROOT = path.join(import.meta.dir, "..", "..", "javascript", "manga", "src");

/**
 * Read a vendored Mangayomi extension's JS source. `relativePath` is e.g.
 * `all/mangadex.js`. Throws if missing | we never silently fall back.
 */
export const loadMangaExtension = async (relativePath: string): Promise<string> => {
  const file = Bun.file(path.join(MANGA_ROOT, relativePath));
  if (!(await file.exists())) {
    throw new Error(`vendored extension not found: ${relativePath}`);
  }
  return file.text();
};

/**
 * Version stamp baked into responses so the running snapshot is observable.
 * Bump on each sync | see `EXTENSIONS_SYNC.md`.
 */
export const VENDORED_VERSION = "m2k3a-2026-05-19" as const;
