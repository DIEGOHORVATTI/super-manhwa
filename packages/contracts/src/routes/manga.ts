import { oc } from "@orpc/contract";
import { z } from "zod";

import { langFilterSchema, paginationSchema } from "../schemas/base";
import {
  chaptersResultSchema,
  charactersResultSchema,
  coreResultSchema,
  genresResultSchema,
  langsResultSchema,
  mangaListSchema,
  mangaSortSchema,
  mangaStatusSchema,
  metaResultSchema,
  pagesResultSchema,
  suggestResultSchema,
} from "../schemas/manga";

const prefix = oc.route({ tags: ["Manga"] });

/**
 * Manga catalog contract | source-agnostic on the wire. The backend mints opaque
 * ids and the frontend just forwards them. Filters are limited to language and
 * genre (no source/platform filter, by design).
 */
export const manga = oc.prefix("/manga").router({
  popular: prefix
    .route({ method: "GET", path: "/popular", summary: "Trending across all integrations" })
    .input(
      langFilterSchema.merge(paginationSchema).extend({
        genre: z.string().optional(),
        status: mangaStatusSchema.optional(),
        sort: mangaSortSchema.default("popular"),
      }),
    )
    .output(mangaListSchema),

  search: prefix
    .route({ method: "GET", path: "/search", summary: "Search across all integrations" })
    .input(
      langFilterSchema.merge(paginationSchema).extend({
        q: z.string(),
        genre: z.string().optional(),
        status: mangaStatusSchema.optional(),
      }),
    )
    .output(mangaListSchema),

  suggest: prefix
    .route({ method: "GET", path: "/suggest", summary: "Autocomplete suggestions (fast path)" })
    .input(z.object({ q: z.string() }).merge(langFilterSchema))
    .output(suggestResultSchema),

  core: prefix
    .route({
      method: "GET",
      path: "/core",
      summary: "Manga metadata only | fast, no chapters (by opaque id)",
    })
    .input(
      z.object({
        id: z.string(),
        /** Optional title hint | used as a fallback display name when the
         *  catalog has no entry for this id. */
        name: z.string().optional(),
      }),
    )
    .output(coreResultSchema),

  chapters: prefix
    .route({
      method: "GET",
      path: "/chapters",
      summary: "Merged chapters across reading sources (by opaque id)",
    })
    .input(
      z.object({
        id: z.string(),
        /** Optional title hint | enables cross-source fallback when the primary
         *  returns zero chapters or an extension-side parse error. */
        name: z.string().optional(),
      }),
    )
    .output(chaptersResultSchema),

  pages: prefix
    .route({ method: "GET", path: "/pages", summary: "Chapter page images (by opaque id)" })
    .input(z.object({ id: z.string() }))
    .output(pagesResultSchema),

  langs: prefix
    .route({ method: "GET", path: "/langs", summary: "Languages available across integrations" })
    .input(z.object({}))
    .output(langsResultSchema),

  genres: prefix
    .route({ method: "GET", path: "/genres", summary: "Genres seen in the enriched trending pool" })
    .input(langFilterSchema)
    .output(genresResultSchema),

  meta: prefix
    .route({
      method: "GET",
      path: "/meta",
      summary: "Rich metadata (tags, score, banner, relations) by title",
    })
    .input(z.object({ name: z.string() }))
    .output(metaResultSchema),

  characters: prefix
    .route({
      method: "GET",
      path: "/characters",
      summary: "Character list by title | heavy, loaded on demand for the tab",
    })
    .input(z.object({ name: z.string() }))
    .output(charactersResultSchema),
});
