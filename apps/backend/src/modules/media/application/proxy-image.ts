import type { IdStore } from "@/core/domain/id-store";
import type { ConnectorRegistry } from "@/modules/catalog/infrastructure/connector-registry";

import type { ImageFetcher } from "../domain/image-fetcher";
import type { ImageByteCache } from "../infrastructure/image-byte-cache";

const RESPONSE_HEADERS = (contentType: string): HeadersInit => ({
  "content-type": contentType,
  // The Next proxy overrides this per kind (public-immutable for covers,
  // private for pages); kept here for direct/backend-only access.
  "cache-control": "public, max-age=86400",
  "access-control-allow-origin": "*",
});

/**
 * Decode an opaque image token, look up the connector's Referer base URL, and
 * stream the upstream bytes back. Bytes are cached in-process (shared across
 * sessions, keyed by token) so the same cover/page isn't re-fetched from the
 * source CDN for every visitor; a cache hit skips the upstream entirely.
 */
export const makeProxyImage =
  (idStore: IdStore, registry: ConnectorRegistry, fetcher: ImageFetcher, cache: ImageByteCache) =>
  async (token: string): Promise<Response> => {
    const cached = cache.get(token);
    if (cached) {
      return new Response(cached.body, { headers: RESPONSE_HEADERS(cached.contentType) });
    }

    const ref = idStore.decode(token);
    if (!ref) return new Response("bad token", { status: 400 });
    const connector = await registry.resolve(ref.source);
    const res = await fetcher.fetch({
      url: ref.url,
      referer: connector ? `${connector.baseUrl}/` : undefined,
    });
    if (!res.ok) return res; // upstream error — don't cache

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const body = await res.arrayBuffer();
    cache.set(token, { body, contentType });
    return new Response(body, { headers: RESPONSE_HEADERS(contentType) });
  };
