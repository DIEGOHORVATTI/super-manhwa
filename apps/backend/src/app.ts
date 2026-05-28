import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { CORSPlugin } from "@orpc/server/plugins";
import { ZodSmartCoercionPlugin } from "@orpc/zod";

import { imageProxyRoute } from "@/modules/media/presentation/routes/image-routes";
import { router } from "@/router";

/**
 * Composable Web Request → Response handler.
 *
 *  - `/api/img/<token>`  → raw binary stream from the media module
 *  - everything else     → oRPC OpenAPIHandler (the `/api` prefix is stripped
 *                          before dispatch because the contracts paths are
 *                          root-relative)
 */
const apiHandler = new OpenAPIHandler(router, {
  plugins: [
    new CORSPlugin({ origin: "*", allowMethods: ["GET", "OPTIONS"] }),
    new ZodSmartCoercionPlugin(),
  ],
  interceptors: [
    async (options) => {
      try { return await options.next(); }
      catch (error) {
        console.error(`✗ [${options.request.method}] ${options.request.url}`, error);
        throw error;
      }
    },
  ],
});

export async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, "") || "/";

  if (path.startsWith("/img/")) return imageProxyRoute(path.slice(5));

  const orpcReq = new Request(new URL(path + url.search, url.origin), req);
  const { matched, response } = await apiHandler.handle(orpcReq);
  if (matched && response) return response;

  return new Response(JSON.stringify({ error: "not found", path }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
}
