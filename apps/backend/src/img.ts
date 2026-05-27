/**
 * Image proxy — covers/pages often need a Referer (hotlink protection) and lack
 * CORS, so the browser can't load them directly. Not part of the oRPC contract
 * (binary, not JSON); served as a raw route.
 */
import { resolveSource } from "./loader.js";

const UA =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";

export async function imageProxy(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const target = url.searchParams.get("url");
  if (!target) return new Response("missing url", { status: 400 });
  const src = await resolveSource(url.searchParams.get("source") ?? "");
  const upstream = await fetch(target, {
    headers: { Referer: src ? src.baseUrl + "/" : "", "User-Agent": UA },
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
      "cache-control": "public, max-age=86400",
      "access-control-allow-origin": "*",
    },
  });
}
