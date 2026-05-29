import type { Cache } from "@/core/domain/cache";

import type { CatalogSource } from "../domain/catalog-source";

const GENRES_TTL = 6 * 60 * 60 * 1000; // the genre vocabulary is effectively static

/** The catalog's genre vocabulary (AniList's fixed genre collection). */
export const makeListGenres =
  (catalog: CatalogSource, cache: Cache) =>
  async (_input?: { lang?: string }): Promise<{ genres: string[] }> =>
    cache.remember("genres", GENRES_TTL, async () => {
      const genres = await catalog.genres();
      return { genres: genres.slice().sort((a, b) => a.localeCompare(b)) };
    });
