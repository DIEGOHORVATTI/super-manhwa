import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth/server";

/**
 * Better Auth catch-all handler (sign-in/up, verify, reset, OAuth callbacks,
 * session). 503s when auth isn't configured (no DATABASE_URL), matching the
 * app's graceful-degradation contract.
 */
const unconfigured = () =>
  new Response(JSON.stringify({ error: "auth_unconfigured" }), {
    status: 503,
    headers: { "content-type": "application/json" },
  });

const handlers = auth ? toNextJsHandler(auth) : { GET: unconfigured, POST: unconfigured };

export const GET = handlers.GET;
export const POST = handlers.POST;
