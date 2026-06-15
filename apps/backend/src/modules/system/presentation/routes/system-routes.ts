import { getHealth } from "@/container";
import { pub } from "@/context";

/**
 * Health route | `pub` (not `auth`), so it bypasses the X-API-KEY guard. This
 * is the only intentionally-anonymous endpoint in the service.
 */
export const getHealthRoute = pub.health.handler(async () => getHealth());
