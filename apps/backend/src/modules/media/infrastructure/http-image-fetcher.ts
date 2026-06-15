import { httpFetchRaw } from "@/shared/http-fetch";

import type { ImageFetcher } from "../domain/image-fetcher";

const DEFAULT_UA =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";

/**
 * Streams image bytes from the upstream CDN with the headers most hotlinking
 * CDNs check (UA + Referer derived from source.baseUrl). The proxy keeps the
 * response body opaque to the caller via `Response.body` | no buffering. When
 * upstream errors, we surface a same-shaped error response so the caller
 * doesn't have to special-case it.
 */
export const makeHttpImageFetcher = (): ImageFetcher => ({
  async fetch({ url, referer }) {
    const result = await httpFetchRaw(url, {
      headers: {
        Referer: referer ?? "",
        "User-Agent": DEFAULT_UA,
      },
    });
    if (result.error) {
      return new Response(result.error.body || "upstream image error", {
        status: result.error.status,
        headers: { "content-type": "text/plain", "access-control-allow-origin": "*" },
      });
    }
    const upstream = result.value;
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
        "cache-control": "public, max-age=86400",
        "access-control-allow-origin": "*",
      },
    });
  },
});
