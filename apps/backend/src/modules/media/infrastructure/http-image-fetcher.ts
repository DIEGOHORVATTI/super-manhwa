import type { ImageFetcher } from "../domain/image-fetcher";

const DEFAULT_UA =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";

/**
 * Plain `fetch()` with the headers most hotlinking CDNs check: a recognised UA
 * and a Referer derived from the source's baseUrl. Without these, Naver/Webtoons
 * and friends return 403.
 */
export const makeHttpImageFetcher = (): ImageFetcher => ({
  async fetch({ url, referer }) {
    const upstream = await fetch(url, {
      headers: {
        Referer: referer ?? "",
        "User-Agent": DEFAULT_UA,
      },
    });
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
