import { z } from "zod";

/** Pagination input shared across listing endpoints. */
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
});

/** Optional language filter — the only legitimate UI filter besides genre. */
export const langFilterSchema = z.object({
  lang: z.string().optional(),
});
