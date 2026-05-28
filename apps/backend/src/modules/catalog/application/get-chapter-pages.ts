import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";
import { badRequest, notFound } from "@/shared/errors";

import type { MangaCatalog } from "../domain/manga-catalog";
import type { SourceRegistry } from "../domain/source";

const PAGES_TTL = 60 * 60 * 1000;

/**
 * Resolve a chapter's image URLs and pre-encode them as opaque proxy paths,
 * so the browser never sees the CDN host.
 */
export const makeGetChapterPages = (
  registry: SourceRegistry,
  catalog: MangaCatalog,
  idStore: IdStore,
  cache: Cache,
) => async ({ id }: { id: string }): Promise<{ pages: string[] }> => {
  const ref = idStore.decode(id);
  if (!ref) badRequest("invalid chapter id");
  const src = await registry.resolve(ref.source);
  if (!src) notFound("unknown source");

  const key = `pages:${src.id}:${ref.url}`;
  return cache.remember(key, PAGES_TTL, async () => {
    const raw = await catalog.getPageList(src, ref.url);
    const pages = (Array.isArray(raw) ? raw : []).map((p) => {
      const url = typeof p === "string" ? p : p.url;
      return `/api/img/${idStore.encode({ source: src.id, url })}`;
    });
    return { pages };
  });
};
