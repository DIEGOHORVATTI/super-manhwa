import { z } from "zod";

/** Where the data came from (echoed back so the UI can show the source). */
export const sourceRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  lang: z.string(),
  hasCloudflare: z.boolean(),
});
export type SourceRef = z.infer<typeof sourceRefSchema>;

export const mangaEntrySchema = z.object({
  name: z.string(),
  link: z.string(),
  imageUrl: z.string().optional(),
});
export type MangaEntry = z.infer<typeof mangaEntrySchema>;

export const mangasPageSchema = z.object({
  source: sourceRefSchema,
  list: z.array(mangaEntrySchema),
  hasNextPage: z.boolean(),
});
export type MangasPage = z.infer<typeof mangasPageSchema>;

export const chapterSchema = z.object({
  name: z.string(),
  url: z.string(),
  scanlator: z.string().optional(),
  dateUpload: z.string().optional(),
});
export type Chapter = z.infer<typeof chapterSchema>;

export const mangaDetailSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  author: z.string().optional(),
  genre: z.array(z.string()).optional(),
  status: z.number().optional(),
  imageUrl: z.string().optional(),
  chapters: z.array(chapterSchema).optional(),
});
export type MangaDetail = z.infer<typeof mangaDetailSchema>;

export const detailResultSchema = z.object({ source: sourceRefSchema, detail: mangaDetailSchema });
export const pagesResultSchema = z.object({ source: sourceRefSchema, pages: z.array(z.string()) });
