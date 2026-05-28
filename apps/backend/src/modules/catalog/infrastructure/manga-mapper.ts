import type { MangaStatus } from "@packages/contracts";
import type { IdStore } from "@/core/domain/id-store";

import type { Chapter, MangaDetail, MangaSummary } from "../domain/manga";
import type { RawChapter, RawDetail, RawListItem } from "../domain/manga-catalog";
import type { Source } from "../domain/source";

/**
 * Mangayomi extension raw shape ↔ our domain types. Centralised here so a
 * future change in the extension protocol (e.g. new fields) is a one-file
 * patch.
 */

const STATUS_MAP: Record<number, MangaStatus> = {
  0: "ongoing",
  1: "completed",
  2: "hiatus",
  3: "cancelled",
  4: "publishing-finished",
};

const mapStatus = (n: unknown): MangaStatus | undefined =>
  typeof n === "number" && n in STATUS_MAP ? STATUS_MAP[n] : undefined;

/**
 * Server-relative URL for the image proxy, built from the same id-store that
 * mints manga/chapter ids — keeps every opaque path on the same trust chain.
 */
const imagePath = (idStore: IdStore, source: string, url?: string): string | undefined =>
  url ? `/api/img/${idStore.encode({ source, url })}` : undefined;

export const MangaMapper = {
  toSummary(idStore: IdStore, src: Source, raw: RawListItem): MangaSummary {
    return {
      id: idStore.encode({ source: src.id, url: raw.link }),
      name: raw.name,
      imageUrl: imagePath(idStore, src.id, raw.imageUrl),
      lang: src.lang,
    };
  },

  toChapter(idStore: IdStore, src: Source, raw: RawChapter): Chapter {
    return {
      id: idStore.encode({ source: src.id, url: raw.url }),
      name: raw.name,
      scanlator: raw.scanlator,
      dateUpload: raw.dateUpload,
    };
  },

  toDetail(idStore: IdStore, src: Source, raw: RawDetail): MangaDetail {
    return {
      // MangaDex's extension omits the title from getDetail; some others use
      // `title`, some `name`. We accept either; callers can fall back to the
      // listing name via the `?n=` hint.
      title: raw.title ?? raw.name,
      description: raw.description,
      author: raw.author,
      artist: raw.artist,
      genre: raw.genre,
      status: mapStatus(raw.status),
      imageUrl: imagePath(idStore, src.id, raw.imageUrl),
      chapters: (raw.chapters ?? []).map((c) => MangaMapper.toChapter(idStore, src, c)),
      lang: src.lang,
    };
  },
};
