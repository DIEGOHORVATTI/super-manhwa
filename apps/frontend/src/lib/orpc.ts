/**
 * oRPC client — the ONLY place transport (URL/fetch) is configured. Components
 * never touch URLs; they call type-safe methods inferred from @packages/contracts.
 * (GUIA-ORPC §5.) Same-origin /api is proxied (Vite dev → Bun; Vercel → container).
 */
import { createORPCClient, onError } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import type { JsonifiedClient } from "@orpc/openapi-client";
import { OpenAPILink } from "@orpc/openapi-client/fetch";
import { createORPCReactQueryUtils } from "@orpc/react-query";
import { contracts } from "@packages/contracts";

const link = new OpenAPILink(contracts, {
  url: () => `${window.location.origin}/api`,
  interceptors: [onError((error) => console.error("[orpc]", error))],
});

/** Fully typed client inferred from the contract — no codegen, no duplicated types. */
export const orpcClient: JsonifiedClient<ContractRouterClient<typeof contracts>> = createORPCClient(link);

/** TanStack Query bindings (auto queryKey/queryFn from the contract). */
export const orpc = createORPCReactQueryUtils(orpcClient);
