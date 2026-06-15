import type { MangaCore } from "@packages/contracts";

import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";
import { notFound } from "@/shared/errors";
import { signCoverPath } from "@/shared/image-sign";

import type { CatalogSource } from "../domain/catalog-source";
import { loadWork } from "./work-cache";

/** Reading language the page presents chapters in | kept aligned with the
 *  chapters route so both halves agree on a default. */
const PREFERRED_LANG = "pt-br";

/**
 * Fast half of the obra page: a work's non-chapter metadata (title, cover,
 * description, genres, status). Identity comes from the AniList catalog | the
 * `id` is an AniList id | so this resolves in a single (cached) round-trip and
 * the page can paint its hero immediately while the cross-source chapter fan-out
 * ({@link makeGetMangaChapters}) streams in separately.
 */
export const makeGetMangaCore =
  (catalog: CatalogSource, idStore: IdStore, cache: Cache) =>
  async ({
    id,
    name,
  }: {
    id: string;
    name?: string;
  }): Promise<{ core: MangaCore; lang: string }> => {
    const work = await loadWork(cache, catalog, id);
    if (!work && !name) throw notFound("unknown work");

    const imageUrl = work?.imageUrl
      ? signCoverPath(`/api/img/${idStore.encode({ source: "anilist", url: work.imageUrl })}`)
      : undefined;

    const core: MangaCore = {
      title: work?.title ?? name,
      description: work?.description,
      genre: work?.genres,
      status: work?.status,
      imageUrl,
      aliases: work?.aliases ?? [],
    };
    return { core, lang: PREFERRED_LANG };
  };
