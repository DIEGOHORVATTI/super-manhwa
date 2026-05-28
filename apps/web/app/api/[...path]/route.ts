/**
 * Same-origin proxy: every `/api/*` request from the browser is forwarded to the
 * delivery backend. The browser never sees DELIVERY_SERVICE_URL — only this
 * same-origin path. Used for image bytes (/api/img/<token>) and any client-side
 * fetch (e.g. the search autocomplete hitting /api/manga/suggest).
 *
 * The RSC oRPC client bypasses this and talks to the backend directly server-side.
 */
const BACKEND = process.env.DELIVERY_SERVICE_URL ?? "http://localhost:8787";

const PASS_HEADERS = new Set(["content-type", "cache-control", "etag", "last-modified"]);

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await ctx.params;
  const url = new URL(req.url);
  const upstream = await fetch(`${BACKEND}/api/${path.join("/")}${url.search}`, { method: "GET" });

  const headers = new Headers();
  for (const [k, v] of upstream.headers) if (PASS_HEADERS.has(k.toLowerCase())) headers.set(k, v);
  return new Response(upstream.body, { status: upstream.status, headers });
}
