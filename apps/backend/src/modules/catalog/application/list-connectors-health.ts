import type { ConnectorHealth } from "@packages/contracts";

import type { ConnectorRegistry } from "../infrastructure/connector-registry";

/** Per-connector probe budget (CF connectors go through FlareSolverr | slow). */
const PROBE_TIMEOUT_MS = 12_000;

/**
 * Probe every curated reading connector on demand (admin health panel). Each is
 * pinged with `getPopular(1)` under a timeout, in parallel; a thrown/timed-out
 * probe marks the connector down. Reports latency + sample count.
 */
export const makeListConnectorsHealth =
  (registry: ConnectorRegistry) => async (): Promise<ConnectorHealth[]> => {
    const connectors = registry.listCurated();
    return Promise.all(
      connectors.map(async (c) => {
        const base = {
          id: c.id,
          name: c.name,
          langs: [...c.langs],
          hasCloudflare: c.hasCloudflare,
          isNsfw: c.isNsfw,
        };
        const start = Date.now();
        try {
          const res = await Promise.race([
            c.getPopular(1),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("timeout")), PROBE_TIMEOUT_MS),
            ),
          ]);
          return {
            ...base,
            status: "up" as const,
            latencyMs: Date.now() - start,
            sample: res?.list?.length ?? 0,
          };
        } catch {
          return { ...base, status: "down" as const, latencyMs: Date.now() - start, sample: 0 };
        }
      }),
    );
  };
