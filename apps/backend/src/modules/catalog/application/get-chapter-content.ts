import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";
import { badRequest, notFound } from "@/shared/errors";

import type { ConnectorRegistry } from "../infrastructure/connector-registry";

/** Prose is effectively immutable once published | cache long. */
const CONTENT_TTL = 24 * 60 * 60 * 1000;

/**
 * A novel chapter's prose, resolved from its source connector by opaque id. The
 * page reader's text-twin: where {@link makeGetChapterPages} returns image proxy
 * paths, this returns source HTML (sanitized web-side before render). Sources
 * without `getChapterContent` (image manga) 404 here | callers use `pages`.
 */
export const makeGetChapterContent =
  (registry: ConnectorRegistry, idStore: IdStore, cache: Cache) =>
  async ({ id }: { id: string }): Promise<{ html: string; title?: string }> => {
    const ref = idStore.decode(id);
    if (!ref) throw badRequest("invalid chapter id");
    const connector = await registry.resolve(ref.source);
    if (!connector) throw notFound("unknown source");
    if (!connector.getChapterContent) throw notFound("source has no text content");

    return cache.remember(`content:${connector.id}:${ref.url}`, CONTENT_TTL, async () => {
      const raw = await connector.getChapterContent!(ref.url);
      return { html: raw.html, title: raw.title };
    });
  };
