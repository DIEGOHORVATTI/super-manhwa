import { implement } from "@orpc/server";
import { contracts } from "@packages/contracts";

import { env } from "@/config/env";
import { unauthorized } from "@/shared/errors";

/**
 * Per-request context. Mirrors `novo-horizonte/server/src/auth/types.ts` and
 * `remarketing/.../di/orpc-context.ts` minus the user fields (this app has no
 * end-users; just a shared service-to-service API key).
 */
export type ORPContext = {
  reqHeaders?: Headers;
  resHeaders?: Headers;
  correlationId?: string;
};

/**
 * Builder factory | equivalent to `createORPContext` in @vulpes-ia/server. The
 * `implement(contracts)` call happens HERE, once. Routes never repeat it; they
 * import `auth` and call `auth.<module>.<route>.handler(...)`.
 */
/**
 * Public builder | no auth middleware. Use sparingly; only routes that MUST be
 * anonymous (Docker /health probe, future status pages) should bind to this.
 * Everything else uses `auth`.
 */
export const pub = implement(contracts).$context<ORPContext>();

/**
 * X-API-KEY guard. Every contract route is gated by this | no anonymous access.
 * The shared key is set in `.env` and injected via Docker compose / Vercel env
 * (server-side only; never sent to the browser).
 */
const apiKeyMiddleware = pub.middleware(async ({ context, next }) => {
  const key = context.reqHeaders?.get("x-api-key");
  if (!key || key !== env.API_KEY) {
    unauthorized("missing or invalid X-API-KEY header");
  }
  return next();
});

/**
 * Protected builder | use this for ALL routes that the frontend (or anyone
 * external) will call. The X-API-KEY guard runs before the handler.
 */
export const auth = pub.use(apiKeyMiddleware);

export type Pub = typeof pub;
export type Auth = typeof auth;
