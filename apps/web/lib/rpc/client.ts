import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";

import type { AppRouter } from "./router";

/**
 * Browser-side typed client for the web platform router. `import type` keeps the
 * server router (and its db/auth imports) out of the client bundle | only the
 * types survive. Same-origin; cookies ride along for the Better Auth session.
 */
const link = new RPCLink({
  url:
    typeof window === "undefined"
      ? "http://localhost/api/rpc"
      : `${window.location.origin}/api/rpc`,
});

export const rpc: RouterClient<AppRouter> = createORPCClient(link);
