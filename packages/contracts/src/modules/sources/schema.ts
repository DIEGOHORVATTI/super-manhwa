import { z } from "zod";

/** A manga source (extension) the user can browse. */
export const sourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  lang: z.string(),
  hasCloudflare: z.boolean(),
  isNsfw: z.boolean().optional(),
  iconUrl: z.string(),
  baseUrl: z.string(),
  featured: z.boolean().optional(),
});
export type Source = z.infer<typeof sourceSchema>;

export const sourcesListSchema = z.object({ sources: z.array(sourceSchema) });
export type SourcesList = z.infer<typeof sourcesListSchema>;
