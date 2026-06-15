import type { Health } from "@packages/contracts";

import { APP_INFO } from "@/config/app";

/**
 * Pure synthesis of the health payload. No external IO, no auth | Docker /
 * load balancers poll this so it must always be cheap and predictable.
 *
 * `version` comes from package.json via `APP_INFO`, satisfying the requirement
 * that the backend version is part of the response.
 */
export const makeGetHealth =
  (startedAt: number = Date.now()) =>
  async (): Promise<Health> => ({
    ok: true,
    version: APP_INFO.version,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  });
