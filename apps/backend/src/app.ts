/**
 * The composable request handler (Web Request → Response), shared by the Bun
 * server (server/index.ts) and the Vercel fallback (api/[...path].ts).
 * Routes /api/img to the raw image proxy; everything else goes to the oRPC handler
 * (with the /api prefix stripped, since the contract paths are root-relative).
 */
import { apiHandler } from "./orpc.js";
import { imageProxy } from "./img.js";

export async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, "") || "/";

  if (path === "/img") return imageProxy(req);

  const orpcReq = new Request(new URL(path + url.search, url.origin), req);
  const { matched, response } = await apiHandler.handle(orpcReq);
  if (matched && response) return response;

  return new Response(JSON.stringify({ error: "not found", path }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
}
