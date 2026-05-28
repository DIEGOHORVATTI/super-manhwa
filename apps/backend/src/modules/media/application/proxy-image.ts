import type { IdStore } from "@/core/domain/id-store";

import type { ImageFetcher } from "../domain/image-fetcher";
import type { SourceRegistry } from "@/modules/catalog/domain/source";

/**
 * Decode an opaque image token, look up the source's Referer base URL, and
 * stream the upstream bytes back. Not an oRPC route — binary, served raw.
 */
export const makeProxyImage = (
  idStore: IdStore,
  registry: SourceRegistry,
  fetcher: ImageFetcher,
) => async (token: string): Promise<Response> => {
  const ref = idStore.decode(token);
  if (!ref) return new Response("bad token", { status: 400 });
  const src = await registry.resolve(ref.source);
  return fetcher.fetch({
    url: ref.url,
    referer: src ? src.baseUrl + "/" : undefined,
  });
};
