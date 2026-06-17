import { httpFetchRaw } from "@/shared/http-fetch";

import type { ImageFetcher } from "../domain/image-fetcher";

const DEFAULT_UA =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";
// MangaDex's uploads CDN replies 400 to any browser ("Mozilla…") User-Agent but
// serves fine for a plain app UA. Most other CDNs want the browser UA, so pick per host.
const PLAIN_UA = "SuperManhwa/1.0 (+https://supermanhwa.com)";

/**
 * The right User-Agent for a host. Browser UA by default (most hotlink CDNs
 * expect it); a plain app UA for MangaDex, which 400s on browser UAs.
 * ponytail: host allowlist | the image proxy now logs failing sources, so if
 * another CDN turns out this picky, add it here or move to a per-connector header.
 */
const uaFor = (url: string): string => {
  try {
    return new URL(url).hostname.endsWith("mangadex.org") ? PLAIN_UA : DEFAULT_UA;
  } catch {
    return DEFAULT_UA;
  }
};

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
        "User-Agent": uaFor(url),
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
