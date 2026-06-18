import { z } from "zod";

/**
 * Service health probe. Exposed without auth so Docker / load balancers can
 * poll it | keep this minimal and free of any sensitive state.
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

/** Live health snapshot for one reading connector (probed on demand). */
export const connectorHealthSchema = z.object({
  id: z.string(),
  name: z.string(),
  langs: z.array(z.string()),
  hasCloudflare: z.boolean(),
  isNsfw: z.boolean(),
  status: z.enum(["up", "down"]),
  /** Probe latency in ms. */
  latencyMs: z.number(),
  /** Items returned by the probe (getPopular page 1). */
  sample: z.number(),
});
export const connectorsHealthSchema = z.array(connectorHealthSchema);
export type ConnectorHealth = z.infer<typeof connectorHealthSchema>;
