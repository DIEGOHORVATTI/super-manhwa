import { oc } from "@orpc/contract";
import { z } from "zod";
import { sourcesListSchema } from "./schema.js";

const tag = oc.route({ tags: ["Sources"] });

export const sources = oc.prefix("/sources").router({
  list: tag
    .route({ method: "GET", path: "/", summary: "List available manga sources" })
    .input(z.object({ all: z.coerce.boolean().optional() }))
    .output(sourcesListSchema),
});
