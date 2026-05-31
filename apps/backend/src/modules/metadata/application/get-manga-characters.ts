import type { MangaCharacter } from "@packages/contracts";

import type { IdStore } from "@/core/domain/id-store";

import { type LoadMeta, proxyImage } from "./load-meta";

/**
 * Character list for a title (AniList) — the heavy half of the metadata, split
 * out so the detail page can stream it into the "Personagens" tab instead of
 * blocking the hero on it. Shares {@link makeLoadMeta}'s cache with the meta
 * route, so opening a work costs one AniList lookup, not two.
 */
export const makeGetMangaCharacters =
  (load: LoadMeta, idStore: IdStore) =>
  async ({ name }: { name: string }): Promise<{ characters: MangaCharacter[] }> => {
    const m = name.trim() ? await load(name.trim()) : null;
    if (!m) return { characters: [] };
    return {
      characters: m.characters.map((c) => ({
        name: c.name,
        nativeName: c.nativeName,
        role: c.role,
        imageUrl: proxyImage(idStore, c.imageUrl),
        description: c.description,
        gender: c.gender,
        age: c.age,
        favourites: c.favourites,
      })),
    };
  };
