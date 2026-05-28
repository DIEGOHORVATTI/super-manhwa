import { oc } from "@orpc/contract";
import { z } from "zod";
import { detailResultSchema, mangasPageSchema, pagesResultSchema } from "./schema";

const tag = oc.route({ tags: ["Manga"] });
const sourceInput = z.object({ source: z.string() });
const pageInput = z.object({ source: z.string(), page: z.coerce.number().min(1).default(1) });

export const manga = oc.prefix("/manga").router({
  popular: tag
    .route({ method: "GET", path: "/popular", summary: "Popular manga for a source" })
    .input(pageInput)
    .output(mangasPageSchema),

  search: tag
    .route({ method: "GET", path: "/search", summary: "Search manga in a source" })
    .input(pageInput.extend({ q: z.string() }))
    .output(mangasPageSchema),

  detail: tag
    .route({ method: "GET", path: "/detail", summary: "Manga details + chapters" })
    .input(sourceInput.extend({ url: z.string() }))
    .output(detailResultSchema),

  pages: tag
    .route({ method: "GET", path: "/pages", summary: "Page image URLs of a chapter" })
    .input(sourceInput.extend({ url: z.string() }))
    .output(pagesResultSchema),
});
