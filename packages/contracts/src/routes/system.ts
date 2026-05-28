import { oc } from "@orpc/contract";

import { healthSchema } from "../schemas/system";

/**
 * Top-level health procedure. Lives outside any module namespace so the URL is
 * a flat `/api/health` (matching common probe conventions) and so the backend
 * can bind it to `pub` (no X-API-KEY) without nesting concerns.
 */
const prefix = oc.route({ tags: ["System"] });

export const health = prefix
  .route({ method: "GET", path: "/health", summary: "Service health probe" })
  .output(healthSchema);
