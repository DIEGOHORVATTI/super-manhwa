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
});
export type Chapter = z.infer<typeof chapterSchema>;

export const mangaDetailSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  author: z.string().optional(),
  artist: z.string().optional(),
  genre: z.array(z.string()).optional(),
  status: mangaStatusSchema.optional(),
  imageUrl: z.string().optional(),
  chapters: z.array(chapterSchema).optional(),
});
export type MangaDetail = z.infer<typeof mangaDetailSchema>;

export const detailResultSchema = z.object({ detail: mangaDetailSchema, lang: z.string() });
export const pagesResultSchema = z.object({ pages: z.array(z.string()) });
export const suggestResultSchema = z.object({ list: z.array(mangaSummarySchema) });
export const langsResultSchema = z.object({ langs: z.array(z.string()) });
export const genresResultSchema = z.object({ genres: z.array(z.string()) });

/** Sort modes for the listing. `popular` is the raw, fast default. The others
 *  trigger enrichment (parallel detail calls) and are bounded to top-N items. */
export const mangaSortSchema = z.enum(["popular", "newest", "completed"]);
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
  characters: z.array(mangaCharacterSchema).default([]),
  relations: z.array(mangaRelationSchema).default([]),
  description: z.string().optional(),
});
export type MangaMeta = z.infer<typeof mangaMetaSchema>;

export const metaResultSchema = z.object({ meta: mangaMetaSchema });
