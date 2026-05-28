import type { IdStore } from "@/core/domain/id-store";
import type { ConnectorRegistry } from "@/modules/catalog/infrastructure/connector-registry";

import type { ImageFetcher } from "../domain/image-fetcher";

/**
 * Decode an opaque image token, look up the connector's Referer base URL, and
 * stream the upstream bytes back. Not an oRPC route — binary, served raw.
 */
export const makeProxyImage =
  (idStore: IdStore, registry: ConnectorRegistry, fetcher: ImageFetcher) =>
  async (token: string): Promise<Response> => {
    const ref = idStore.decode(token);
    if (!ref) return new Response("bad token", { status: 400 });
    const connector = await registry.resolve(ref.source);
    return fetcher.fetch({
      url: ref.url,
      referer: connector ? `${connector.baseUrl}/` : undefined,
    });
  };
