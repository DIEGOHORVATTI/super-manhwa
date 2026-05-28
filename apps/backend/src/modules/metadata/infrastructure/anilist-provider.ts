import { httpFetch } from "@/shared/http-fetch";

import type { MangaMeta, MetadataProvider } from "../domain/manga-meta";

const ENDPOINT = "https://graphql.anilist.co";

const QUERY = `query ($s: String) {
  Media(search: $s, type: MANGA, sort: POPULARITY_DESC) {
    averageScore
    bannerImage
    description(asHtml: false)
    tags { name rank }
    characters(sort: ROLE, perPage: 12) {
      edges { role node { name { full } image { large } } }
    }
    relations {
      edges { relationType node { type title { english romaji } } }
    }
  }
}`;

interface AniListResponse {
  data?: {
    Media?: {
      averageScore?: number | null;
      bannerImage?: string | null;
      description?: string | null;
      tags?: Array<{ name: string; rank: number | null }>;
      characters?: {
        edges?: Array<{
          role?: string;
          node?: { name?: { full?: string }; image?: { large?: string } };
        }>;
      };
      relations?: {
        edges?: Array<{
          relationType?: string;
          node?: { type?: string; title?: { english?: string | null; romaji?: string | null } };
        }>;
      };
    } | null;
  };
}

/**
 * AniList GraphQL metadata provider. Public, free, no API key (generous
 * ~90 req/min rate limit). Returns the most-popular manga matching the title.
 * Image URLs are raw AniList CDN here — the use case proxies them.
 */
export const makeAniListProvider = (): MetadataProvider => ({
  async byTitle(title) {
    const result = await httpFetch<AniListResponse>(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { s: title } }),
    });
    if (result.error) return null;
    const m = result.value.data?.Media;
    if (!m) return null;

    const meta: MangaMeta = {
      score: m.averageScore ?? undefined,
      bannerImage: m.bannerImage ?? undefined,
      description: m.description ?? undefined,
      tags: (m.tags ?? [])
        .slice()
        .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
        .slice(0, 12)
        .map((t) => t.name),
      characters: (m.characters?.edges ?? [])
        .filter((e) => e.node?.name?.full)
        .map((e) => ({
          name: e.node!.name!.full!,
          role: e.role,
          imageUrl: e.node?.image?.large ?? undefined,
        })),
      relations: (m.relations?.edges ?? [])
        .filter(
          (e) => e.node?.type === "MANGA" && (e.node?.title?.english || e.node?.title?.romaji),
        )
        .map((e) => ({
          relation: e.relationType ?? "RELATED",
          title: (e.node!.title!.english ?? e.node!.title!.romaji)!,
        })),
    };
    return meta;
  },
});
