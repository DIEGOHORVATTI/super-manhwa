import type { MangaStatus } from "@packages/contracts";
import type { ConnectorMeta, RawChapter, RawDetail, RawListItem } from "@packages/extension";
import type { IdStore } from "@/core/domain/id-store";

import { signCoverPath } from "@/shared/image-sign";

import type { CatalogItem } from "../domain/catalog-source";
import type { Chapter, MangaDetail, MangaSummary } from "../domain/manga";

/**
 * Raw connector shapes ↔ our domain types. Centralised here so a change in
 * the connector contract (new optional fields, status mapping tweaks) is a
 * one-file patch.
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
 * Primary reading language assumed for catalog (AniList) listings. Discovery is
 * language-agnostic — we can't probe each work's sources cheaply at listing time
 * — and the curated reading pool is overwhelmingly pt-br today, so covers show
 * the BR flag by default. The detail page computes the *real* per-work language
 * mix from the merged chapters.
 */
const PRIMARY_LANG = "pt-br";

/**
 * Server-relative URL for the image proxy, built from the same id-store that
 * mints manga/chapter ids — keeps every opaque path on the same trust chain.
 */
const imagePath = (idStore: IdStore, source: string, url?: string): string | undefined =>
  url ? signCoverPath(`/api/img/${idStore.encode({ source, url })}`) : undefined;

export const MangaMapper = {
  /**
   * Catalog (AniList) item → listing summary. The opaque `id` IS the AniList id
   * (no connector behind it); covers are proxied under the synthetic "anilist"
   * source. `lang` is empty — discovery is language-agnostic now.
   */
  catalogSummary(idStore: IdStore, item: CatalogItem): MangaSummary {
    return {
      id: item.id,
      name: item.title,
      imageUrl: imagePath(idStore, "anilist", item.imageUrl),
      lang: "",
      langs: [PRIMARY_LANG],
      status: item.status,
      genres: item.genres,
      chapters: item.chapters,
      description: item.description,
    };
  },

  toSummary(idStore: IdStore, meta: ConnectorMeta, raw: RawListItem, lang?: string): MangaSummary {
    return {
      id: idStore.encode({ source: meta.id, url: raw.link }),
      name: raw.name,
      imageUrl: imagePath(idStore, meta.id, raw.imageUrl),
      // `lang` = the language this batch was fetched in; defaults to the
      // connector's first supported language when the caller doesn't pin one.
      lang: lang ?? meta.langs[0],
      langs: meta.langs,
    };
  },

  toChapter(idStore: IdStore, meta: ConnectorMeta, raw: RawChapter, lang?: string): Chapter {
    return {
      id: idStore.encode({ source: meta.id, url: raw.url }),
      name: raw.name,
      scanlator: raw.scanlator,
      dateUpload: raw.dateUpload,
      lang: lang ?? meta.langs[0],
      source: meta.id,
    };
  },

  toDetail(idStore: IdStore, meta: ConnectorMeta, raw: RawDetail, lang?: string): MangaDetail {
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
      imageUrl: imagePath(idStore, meta.id, raw.imageUrl),
      chapters: (raw.chapters ?? []).map((c) => MangaMapper.toChapter(idStore, meta, c, lang)),
      lang: lang ?? meta.langs[0],
    };
  },
};
