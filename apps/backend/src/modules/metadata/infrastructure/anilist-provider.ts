import { httpFetch } from "@/shared/http-fetch";

import type { MangaMeta, MetadataProvider } from "../domain/manga-meta";

const ENDPOINT = "https://graphql.anilist.co";

const META_FIELDS = `averageScore
    bannerImage
    description(asHtml: false)
    tags { name rank }
    characters(sort: ROLE, perPage: 12) {
      edges {
        role
        node {
          name { full native }
          image { large }
          description(asHtml: false)
          gender
          age
          favourites
        }
      }
    }
    relations {
      edges { relationType node { type title { english romaji } } }
    }`;

/** `typed` pins `type: MANGA`; the untyped variant is the fallback for works
 *  AniList only carries as an anime (e.g. "The Beginning After the End"), so
 *  characters/relations still resolve instead of coming back empty. */
const metaQuery = (typed: boolean) => `query ($s: String) {
  Media(search: $s${typed ? ", type: MANGA" : ""}, sort: POPULARITY_DESC) {
    ${META_FIELDS}
  }
}`;

/** Lightweight query | just the title variants, for cross-source name matching. */
const ALIAS_QUERY = `query ($s: String) {
  Media(search: $s, type: MANGA, sort: POPULARITY_DESC) {
    title { romaji english native }
    synonyms
  }
}`;

interface AliasResponse {
  data?: {
    Media?: {
      title?: { romaji?: string | null; english?: string | null; native?: string | null };
      synonyms?: Array<string | null>;
    } | null;
  };
}

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
          node?: {
            name?: { full?: string; native?: string | null };
            image?: { large?: string };
            description?: string | null;
            gender?: string | null;
            age?: string | null;
            favourites?: number | null;
          };
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
 * Image URLs are raw AniList CDN here | the use case proxies them.
 */
export const makeAniListProvider = (): MetadataProvider => ({
  async byTitle(title) {
    const fetchMeta = async (typed: boolean) => {
      const result = await httpFetch<AniListResponse>(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: metaQuery(typed), variables: { s: title } }),
      });
      return result.error ? null : (result.value.data?.Media ?? null);
    };
    // Prefer the manga entry; fall back to any media (anime) when AniList has no
    // manga/novel for this title, so characters/relations aren't empty.
    const m = (await fetchMeta(true)) ?? (await fetchMeta(false));
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
          nativeName: e.node?.name?.native ?? undefined,
          role: e.role,
          imageUrl: e.node?.image?.large ?? undefined,
          description: e.node?.description ?? undefined,
          gender: e.node?.gender ?? undefined,
          age: e.node?.age ?? undefined,
          favourites: e.node?.favourites ?? undefined,
        })),
      // Any related media with a title | MANGA-only filtering dropped every
      // relation for anime-fallback works, leaving the section empty.
      relations: (m.relations?.edges ?? [])
        .filter((e) => e.node?.title?.english || e.node?.title?.romaji)
        .map((e) => ({
          relation: e.relationType ?? "RELATED",
          title: (e.node!.title!.english ?? e.node!.title!.romaji)!,
        })),
    };
    return meta;
  },

  async aliasesByTitle(title) {
    const result = await httpFetch<AliasResponse>(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: ALIAS_QUERY, variables: { s: title } }),
    });
    if (result.error) return [];
    const m = result.value.data?.Media;
    if (!m) return [];
    const variants = [
      m.title?.romaji,
      m.title?.english,
      m.title?.native,
      ...(m.synonyms ?? []),
    ].filter((s): s is string => typeof s === "string" && s.trim().length > 0);
    return Array.from(new Set(variants));
  },
});
