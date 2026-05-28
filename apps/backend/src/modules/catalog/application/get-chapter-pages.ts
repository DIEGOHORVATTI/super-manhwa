import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";
import { badRequest, notFound } from "@/shared/errors";

import type { ConnectorRegistry } from "../infrastructure/connector-registry";

const PAGES_TTL = 60 * 60 * 1000;

/**
 * Resolve a chapter's image URLs and pre-encode them as opaque proxy paths,
 * so the browser never sees the CDN host.
 */
export const makeGetChapterPages =
  (registry: ConnectorRegistry, idStore: IdStore, cache: Cache) =>
  async ({ id }: { id: string }): Promise<{ pages: string[] }> => {
    const ref = idStore.decode(id);
    if (!ref) throw badRequest("invalid chapter id");
    const connector = await registry.resolve(ref.source);
    if (!connector) throw notFound("unknown source");

    const key = `pages:${connector.id}:${ref.url}`;
    return cache.remember(key, PAGES_TTL, async () => {
      const raw = await connector.getPageList(ref.url);
      const pages = (Array.isArray(raw) ? raw : []).map((p) => {
        const url = typeof p === "string" ? p : p.url;
        return `/api/img/${idStore.encode({ source: connector.id, url })}`;
      });
      return { pages };
    });
  };
