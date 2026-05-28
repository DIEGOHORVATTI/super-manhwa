import "server-only";
import { createORPCClient } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import type { JsonifiedClient } from "@orpc/openapi-client";
import { OpenAPILink } from "@orpc/openapi-client/fetch";
import { contracts } from "@packages/contracts";

/**
 * Server-only oRPC client → the separate delivery backend (Docker container).
 * RSC calls this; the browser never sees DELIVERY_SERVICE_URL — origin stays hidden.
 */
const BACKEND = process.env.DELIVERY_SERVICE_URL ?? "http://localhost:8787";

const link = new OpenAPILink(contracts, { url: `${BACKEND}/api` });

export const api: JsonifiedClient<ContractRouterClient<typeof contracts>> = createORPCClient(link);
