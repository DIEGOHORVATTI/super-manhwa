import type { MangaMeta as WireMangaMeta } from "@packages/contracts";

import type { IdStore } from "@/core/domain/id-store";

import { type LoadMeta, proxyImage } from "./load-meta";

const EMPTY: WireMangaMeta = { tags: [], relations: [] };

/**
 * Rich metadata for a title (AniList) minus characters, which live in their own
 * route. Best-effort: a miss returns an empty meta so the detail page renders
 * without the extras. Image URLs are proxied so the browser never sees the
 * metadata provider's CDN.
 */
export const makeGetMangaMeta =
  (load: LoadMeta, idStore: IdStore) =>
  async ({ name }: { name: string }): Promise<{ meta: WireMangaMeta }> => {
    const m = name.trim() ? await load(name.trim()) : null;
    if (!m) return { meta: EMPTY };
    return {
      meta: {
        score: m.score,
        bannerImage: proxyImage(idStore, m.bannerImage),
        description: m.description,
        tags: m.tags,
        relations: m.relations,
      },
    };
  };
