/**
 * Same-origin proxy: every `/api/*` request from the browser is forwarded to
 * the delivery backend with the shared `X-API-KEY` injected server-side. The
 * browser never sees DELIVERY_SERVICE_URL nor the key.
 *
 * Used for:
 *   - Image bytes  → `/api/img/<token>`  → backend's `/api/img/<token>`
 *   - Autocomplete → `/api/manga/suggest`→ backend's oRPC route
 *   - any future client-side fetch to the backend
 *
 * The RSC oRPC client bypasses this and talks to the backend directly.
 */
const BACKEND = process.env.DELIVERY_SERVICE_URL ?? "http://localhost:8787";
const API_KEY = process.env.API_KEY ?? "dev-api-key-change-in-prod";

const PASS_HEADERS = new Set(["content-type", "cache-control", "etag", "last-modified"]);

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await ctx.params;
  const url = new URL(req.url);
  const upstream = await fetch(`${BACKEND}/api/${path.join("/")}${url.search}`, {
    method: "GET",
    headers: { "X-API-KEY": API_KEY },
  });

  const headers = new Headers();
  for (const [k, v] of upstream.headers) if (PASS_HEADERS.has(k.toLowerCase())) headers.set(k, v);
  return new Response(upstream.body, { status: upstream.status, headers });
}
