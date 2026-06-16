import "server-only";
import { unstable_cache } from "next/cache";

/**
 * Server-side AniList profile fetch (uses the access token stored on the linked
 * `account` row). Powers the profile page's AniList panel and the avatar/banner
 * fallbacks. Cached per AniList account id, refreshed daily — same spirit as
 * `lib/translate.ts`. Any failure returns null (graceful: panel just hides).
 */
const ENDPOINT = "https://graphql.anilist.co";

export interface AnilistFav {
  id: number;
  title: string;
  cover: string | null;
}
export interface AnilistProfile {
  name: string | null;
  avatar: string | null;
  banner: string | null;
  mangaCount: number;
  chaptersRead: number;
  favourites: AnilistFav[];
}

const QUERY = `query {
  Viewer {
    name
    avatar { large }
    bannerImage
    statistics { manga { count chaptersRead } }
    favourites {
      manga(perPage: 12) {
        nodes { id title { english romaji userPreferred } coverImage { large } }
      }
    }
  }
}`;

type ViewerNode = {
  name?: string;
  avatar?: { large?: string };
  bannerImage?: string;
  statistics?: { manga?: { count?: number; chaptersRead?: number } };
  favourites?: {
    manga?: {
      nodes?: Array<{
        id: number;
        title?: { english?: string; romaji?: string; userPreferred?: string };
        coverImage?: { large?: string };
      }>;
    };
  };
};

async function fetchRaw(token: string): Promise<AnilistProfile | null> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: QUERY }),
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { Viewer?: ViewerNode } };
    const v = json.data?.Viewer;
    if (!v) return null;
    const nodes = v.favourites?.manga?.nodes ?? [];
    return {
      name: v.name ?? null,
      avatar: v.avatar?.large ?? null,
      banner: v.bannerImage ?? null,
      mangaCount: v.statistics?.manga?.count ?? 0,
      chaptersRead: v.statistics?.manga?.chaptersRead ?? 0,
      favourites: nodes.map((m) => ({
        id: m.id,
        title: m.title?.english ?? m.title?.romaji ?? m.title?.userPreferred ?? `#${m.id}`,
        cover: m.coverImage?.large ?? null,
      })),
    };
  } catch {
    return null;
  }
}

/** Cached (1 day) AniList profile for a linked account; null on any failure. */
export function anilistProfile(accountId: string, token: string): Promise<AnilistProfile | null> {
  return unstable_cache(() => fetchRaw(token), ["anilist-profile", accountId], {
    revalidate: 60 * 60 * 24,
  })();
}
