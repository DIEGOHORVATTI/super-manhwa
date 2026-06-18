import { getHealth, listConnectorsHealth } from "@/container";
import { auth, pub } from "@/context";

/**
 * Health route | `pub` (not `auth`), so it bypasses the X-API-KEY guard. This
 * is the only intentionally-anonymous endpoint in the service.
 */
export const getHealthRoute = pub.health.handler(async () => getHealth());

/** Connectors health | `auth` (X-API-KEY), surfaced in the web admin panel. */
export const listConnectorsHealthRoute = auth.connectors.handler(async () =>
  listConnectorsHealth(),
);
