import { z } from "zod";

/**
 * Manga publication status, mirroring the Mangayomi extension constants.
 * `unknown` is added for items where the source didn't report one.
 */
export const mangaStatusSchema = z.enum([
  "ongoing",
  "completed",
  "hiatus",
  "cancelled",
  "publishing-finished",
  "unknown",
]);
export type MangaStatus = z.infer<typeof mangaStatusSchema>;

/**
 * Listing item — what shows up on the home grid, search, and autocomplete.
 * Source-agnostic by design: only `id` (opaque) + display fields.
 *
 * Enrichment fields (`status`, `genres`) are present only when the listing
 * route ran in enriched mode (sort/genre filter active); otherwise undefined.
 */
export const mangaSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().optional(),
  lang: z.string(),
  /** Reading languages this work is available in — drives the flag(s) over the
   *  listing cover. Catalog listings can't probe sources cheaply, so this is the
   *  platform's primary reading language for now; enriched later per work. */
  langs: z.array(z.string()).optional(),
  status: mangaStatusSchema.optional(),
  genres: z.array(z.string()).optional(),
  /** Chapter count, when a source can answer cheaply (e.g. MangaDex /aggregate).
   *  Populated only by the suggest route; undefined elsewhere. */
  chapters: z.number().optional(),
});
export type MangaSummary = z.infer<typeof mangaSummarySchema>;

export const mangaListSchema = z.object({
  list: z.array(mangaSummarySchema),
  hasNextPage: z.boolean(),
});
export type MangaList = z.infer<typeof mangaListSchema>;

export const chapterSchema = z.object({
  id: z.string(),
  name: z.string(),
  scanlator: z.string().optional(),
  dateUpload: z.string().optional(),
  /** Source language this chapter was fetched from. Set when a detail merges
   *  chapters across connectors so the UI can flag each row's origin. */
  lang: z.string().optional(),
  /** Reading source this chapter came from (connector id, e.g. `mangafire-ptbr`),
   *  so a merged list shows which site each row was pulled from. */
  source: z.string().optional(),
});
export type Chapter = z.infer<typeof chapterSchema>;

/**
 * Work metadata, no chapters — the fast half of the detail page. Comes straight
 * from the AniList catalog (`catalog.byId`, ~200ms), so the obra page can paint
 * the hero immediately while the slower cross-source chapter fan-out streams in
 * separately via the `chapters` route.
 */
export const mangaCoreSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  author: z.string().optional(),
  artist: z.string().optional(),
  genre: z.array(z.string()).optional(),
  status: mangaStatusSchema.optional(),
  imageUrl: z.string().optional(),
});
export type MangaCore = z.infer<typeof mangaCoreSchema>;

export const coreResultSchema = z.object({ core: mangaCoreSchema, lang: z.string() });
export const chaptersResultSchema = z.object({
  chapters: z.array(chapterSchema),
  lang: z.string(),
});
export const pagesResultSchema = z.object({ pages: z.array(z.string()) });
export const suggestResultSchema = z.object({ list: z.array(mangaSummarySchema) });
export const langsResultSchema = z.object({ langs: z.array(z.string()) });
export const genresResultSchema = z.object({ genres: z.array(z.string()) });

/** Sort modes for the listing. `popular` is the all-time default; `trending`
 *  surfaces what's active right now (AniList TRENDING). `newest`/`completed`
 *  filter the catalog by recency / finished status. */
export const mangaSortSchema = z.enum(["popular", "trending", "newest", "completed"]);
export type MangaSort = z.infer<typeof mangaSortSchema>;

/* ----- Rich metadata (AniList) — powers the detail page's extra tabs ----- */
/* Discovery/metadata layer, NOT a reading source: no opaque source id (the
 * provider is internal), image URLs proxied like covers/pages. */

export const mangaCharacterSchema = z.object({
  name: z.string(),
  /** Native-language name (e.g. Japanese), when known. */
  nativeName: z.string().optional(),
  /** MAIN | SUPPORTING | BACKGROUND (AniList role). */
  role: z.string().optional(),
  imageUrl: z.string().optional(),
  /** Free-text bio (AniList markdown-ish). */
  description: z.string().optional(),
  gender: z.string().optional(),
  age: z.string().optional(),
  /** AniList favourites count. */
  favourites: z.number().optional(),
});
export type MangaCharacter = z.infer<typeof mangaCharacterSchema>;

export const mangaRelationSchema = z.object({
  /** e.g. SEQUEL, PREQUEL, SIDE_STORY, ADAPTATION. */
  relation: z.string(),
  title: z.string(),
});
export type MangaRelation = z.infer<typeof mangaRelationSchema>;

export const mangaMetaSchema = z.object({
  /** 0–100 average score, when known. */
  score: z.number().optional(),
  bannerImage: z.string().optional(),
  tags: z.array(z.string()).default([]),
  relations: z.array(mangaRelationSchema).default([]),
  description: z.string().optional(),
});
export type MangaMeta = z.infer<typeof mangaMetaSchema>;

export const metaResultSchema = z.object({ meta: mangaMetaSchema });

/** Characters live in their own route — heavy, and only the "Personagens" tab needs them. */
export const charactersResultSchema = z.object({
  characters: z.array(mangaCharacterSchema).default([]),
});
