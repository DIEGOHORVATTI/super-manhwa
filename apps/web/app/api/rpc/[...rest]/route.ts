import "server-only";
import { RPCHandler } from "@orpc/server/fetch";

import { createRpcContext } from "@/lib/rpc/context";
import { appRouter } from "@/lib/rpc/router";
import { routes } from "@/lib/routes";

/**
 * Single mount point for the web platform oRPC router (Next adapter). Every
 * `rpc.<domain>.<proc>()` call from the browser lands here. Context (session +
 * db) is built per request; the RPC protocol carries the procedure path + input.
 */
const handler = new RPCHandler(appRouter);

async function handle(req: Request): Promise<Response> {
  const { response } = await handler.handle(req, {
    prefix: routes.api.rpc,
    context: await createRpcContext(req),
  });
  return response ?? new Response("Not Found", { status: 404 });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
