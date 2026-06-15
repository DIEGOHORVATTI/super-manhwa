import { cookies } from "next/headers";
import { env } from "@/lib/env";

import { verifyCover, verifyPage } from "@/lib/image-sign";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * Same-origin proxy: every `/api/*` request from the browser is forwarded to
 * the delivery backend with the shared `X-API-KEY` injected server-side. The
 * browser never sees DELIVERY_SERVICE_URL nor the key.
 *
 * This is also the protection boundary for images (the browser can't reach the
 * backend directly — it lacks the key). Image requests MUST carry a valid
 * signature:
 *   - `?k=` public-cover tag  → served `public, immutable` (CDN + next/image)
 *   - `?e=&s=` session page tag → bound to `mr_sid`, served `private`
 * Anything else (unsigned, forged, expired, wrong session) → 403. Non-image
 * API calls (autocomplete, …) pass straight through.
 *
 * The RSC oRPC client bypasses this and talks to the backend directly.
 */
const BACKEND = env.DELIVERY_SERVICE_URL ?? "http://localhost:8787";
const API_KEY = env.API_KEY ?? "dev-api-key-change-in-prod";

const PASS_HEADERS = new Set(["content-type", "etag", "last-modified"]);
const COVER_CACHE = "public, max-age=31536000, immutable";
const PAGE_CACHE = "private, max-age=7200";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await ctx.params;
  const url = new URL(req.url);

  let cacheControl: string | null = null;
  if (path[0] === "img") {
    const token = path.slice(1).join("/");
    const k = url.searchParams.get("k");
    const e = url.searchParams.get("e");
    const s = url.searchParams.get("s");

    if (verifyCover(token, k)) {
      cacheControl = COVER_CACHE;
    } else {
      const sid = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
      if (verifyPage(token, e, s, sid, Math.floor(Date.now() / 1000))) {
        cacheControl = PAGE_CACHE;
      } else {
        return new Response("forbidden", { status: 403 });
      }
    }
  }

  // Forward only the pathname (drop our signature query — the backend keys on
  // the opaque token alone).
  const upstream = await fetch(
    `${BACKEND}/api/${path.join("/")}${path[0] === "img" ? "" : url.search}`,
    {
      method: "GET",
      headers: { "X-API-KEY": API_KEY },
    },
  );

  const headers = new Headers();
  for (const [k, v] of upstream.headers) if (PASS_HEADERS.has(k.toLowerCase())) headers.set(k, v);
  // Our cache policy wins over the backend's for images.
  if (cacheControl) headers.set("cache-control", cacheControl);
  else {
    const cc = upstream.headers.get("cache-control");
    if (cc) headers.set("cache-control", cc);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
