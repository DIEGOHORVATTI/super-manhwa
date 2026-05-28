import { z } from "zod";

/**
 * Service health probe. Exposed without auth so Docker / load balancers can
 * poll it — keep this minimal and free of any sensitive state.
 */
export const healthSchema = z.object({
  ok: z.boolean(),
  /** Backend version (from package.json at build time). */
  version: z.string(),
  /** Process uptime in seconds, rounded down. */
  uptimeSeconds: z.number(),
  /** ISO timestamp of when the response was produced. */
  timestamp: z.string(),
});
export type Health = z.infer<typeof healthSchema>;
