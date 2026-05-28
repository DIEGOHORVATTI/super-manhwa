import "server-only";
import { createORPCClient } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import type { JsonifiedClient } from "@orpc/openapi-client";
import { OpenAPILink } from "@orpc/openapi-client/fetch";
import { contracts } from "@packages/contracts";

/**
 * Server-only oRPC client → the separate delivery backend (Docker container).
 * RSC calls this directly; the browser never sees DELIVERY_SERVICE_URL nor the
 * shared API_KEY (both are server-only env). For browser-side requests the
 * /api/[...path] route on Next forwards same-origin and injects the key there.
 */
const BACKEND = process.env.DELIVERY_SERVICE_URL ?? "http://localhost:8787";
const API_KEY = process.env.API_KEY ?? "dev-api-key-change-in-prod";

const link = new OpenAPILink(contracts, {
  url: `${BACKEND}/api`,
  headers: () => ({ "X-API-KEY": API_KEY }),
});

export const api: JsonifiedClient<ContractRouterClient<typeof contracts>> = createORPCClient(link);
