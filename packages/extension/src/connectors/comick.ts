import * as cheerio from "cheerio";
import { flareFetch, flareFetchJson } from "../shared/flare-fetch";
import type { MangaConnector, RawDetail, RawListPage, RawPage } from "../types";

/**
 * Comick (pt-br) — NATIVE connector against the current `comick.live` API.
 *
 * The Mangayomi-vendored Comick extension is dead: it targets `api.comick.fun`
 * (offline) with the old `/v1.0/?tachiyomi=true` scheme. Comick rebuilt its API
 * — the live host is `comick.live` with `/api/*` endpoints. We talk to it
 * directly (no crawler), shaped from the actively-maintained keiyoushi
 * `comicklive` extension's DTOs.
 *
 * Endpoints used:
 *   - popular : GET /api/comics/top?days=30&type=follow     → { data: BrowseComic[] }
 *   - search  : GET /api/search?q=&type=comic                → { data: BrowseComic[], next_cursor }
 *   - detail  : GET /comic/{slug}     (HTML, JSON in #comic-data)
 *   - chapters: GET /api/comics/{slug}/chapter-list?lang=pt-br&page=N → { data: Chapter[], pagination }
 *   - pages   : GET /comic/{slug}/{hid}-chapter-{chap}-{lang} (HTML, JSON in #sv-data)
 *
 * VALIDATED working (2026-05): getPopular (50), getDetail("00-solo-leveling")
 * → 365 pt-br chapters, getPageList → real WebP CDN images. `top`, `chapter-list`
 * and the `/comic/{slug}` detail page all pass Cloudflare with a browser UA
 * directly — no FlareSolverr needed. Only `/api/search` trips the CF challenge,
 * so search routes through FlareSolverr (flareFetch) when configured.
 *
 * Kept `hasCloudflare: true` (out of the popular pool) for a product reason,
 * NOT a technical one: `/api/comics/top` is global, not language-filtered, so
 * pooling it would mix English titles into the pt-br home feed. It works as a
 * fallback/detail target via opaque id today (e.g. Solo Leveling → 365 ch).
 * To feature it, add a language-aware popular query or accept the mix.
 */

const BASE = "https://comick.live";
const LANG = "pt-br";

interface BrowseComic {
  default_thumbnail: string;
  slug: string;
  title: string;
}
interface SearchResponse {
  data: BrowseComic[];
  next_cursor?: string | null;
}
interface ComicData {
  title: string;
  slug: string;
  default_thumbnail: string;
  status: number; // 1 ongoing, 2 completed/finished, 3 cancelled, 4 hiatus
  translation_completed?: boolean;
  artists?: Array<{ name: string }>;
  authors?: Array<{ name: string }>;
  desc?: string;
  md_comic_md_genres?: Array<{ md_genres: { name: string } }>;
}
interface ChapterListResponse {
  data: Array<{
    hid: string;
    chap: string;
    vol?: string | null;
    lang: string;
    title?: string | null;
    created_at: string;
    group_name?: string[];
  }>;
  pagination: { current_page: number; last_page: number };
}
interface PageListData {
  chapter: { images: Array<{ url: string }> };
}

/** Comick numeric status → Mangayomi numeric status. */
const mapStatus = (s: number, translationCompleted?: boolean): number => {
  if (s === 1) return 0; // ongoing
  if (s === 2) return translationCompleted ? 1 : 4; // completed / publishing-finished
  if (s === 3) return 3; // cancelled
  if (s === 4) return 2; // hiatus
  return 5;
};

const toListItem = (c: BrowseComic) => ({
  name: c.title,
  link: c.slug, // opaque to the backend; we get it back on getDetail
  imageUrl: c.default_thumbnail,
});

/** Pull the JSON embedded in a `<div id="..." data="{json}">` rendered page. */
const embeddedJson = <T>(html: string, id: string): T => {
  const $ = cheerio.load(html);
  const raw = $(`#${id}`).attr("data") ?? $(`#${id}`).text();
  if (!raw) throw new Error(`comick: #${id} not found`);
  return JSON.parse(raw) as T;
};

export const comickPtBr: MangaConnector = {
  id: "comick-ptbr",
  name: "Comick (pt-br)",
  langs: [LANG],
  baseUrl: BASE,
  iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=comick.live",
  hasCloudflare: true,
  isNsfw: false,
  featured: false,

  async getPopular(_page): Promise<RawListPage> {
    // `/api/comics/top` passes CF with a browser UA — go direct (a solver
    // render would only add latency). See the header note: solver is search-only.
    const data = await flareFetchJson<{ data: BrowseComic[] }>(
      `${BASE}/api/comics/top?days=30&type=follow`,
      { direct: true },
    );
    return { list: (data.data ?? []).map(toListItem), hasNextPage: false };
  },

  async search(query, _page): Promise<RawListPage> {
    // `/api/search` is the one route that trips CF, so it must go through the
    // solver. Its challenge is heavy and flaky (often 30–60 s, sometimes 500),
    // so cap the solve budget: a search that can't clear CF quickly is best
    // abandoned as a typed error and let the aggregator fall back to a faster
    // source, rather than tying up a slow render.
    const sp = new URLSearchParams({ q: query.trim(), type: "comic" });
    const data = await flareFetchJson<SearchResponse>(`${BASE}/api/search?${sp}`, {
      maxTimeout: 30_000,
    });
    return {
      list: (data.data ?? []).map(toListItem),
      hasNextPage: Boolean(data.next_cursor),
    };
  },

  async getDetail(slug): Promise<RawDetail> {
    // Detail page + paginated chapter-list both pass CF with a browser UA, so
    // go direct. Routing the (up to 7+) chapter-list pages through a Chromium
    // render would cost ~7 s each and blow past any reasonable deadline.
    const res = await flareFetch(`${BASE}/comic/${slug}`, { direct: true });
    if (res.status >= 400) throw new Error(`comick detail ${res.status}`);
    const c = embeddedJson<ComicData>(res.body, "comic-data");

    // Chapter list comes from the JSON API, paginated.
    const chapters: NonNullable<RawDetail["chapters"]> = [];
    let page = 1;
    for (;;) {
      const cl = await flareFetchJson<ChapterListResponse>(
        `${BASE}/api/comics/${slug}/chapter-list?lang=${LANG}&page=${page}`,
        { direct: true },
      );
      for (const ch of cl.data ?? []) {
        const label = [
          ch.vol ? `Vol. ${ch.vol}` : null,
          `Cap. ${ch.chap}`,
          ch.title ? `— ${ch.title}` : null,
        ]
          .filter(Boolean)
          .join(" ");
        chapters.push({
          name: label,
          url: `${slug}/${ch.hid}-chapter-${ch.chap}-${ch.lang}`,
          scanlator: (ch.group_name ?? []).join(", ") || undefined,
          dateUpload: ch.created_at ? String(Date.parse(ch.created_at)) : undefined,
        });
      }
      if (!cl.pagination || cl.pagination.current_page >= cl.pagination.last_page) break;
      page++;
      if (page > 50) break; // hard safety cap
    }

    return {
      title: c.title,
      description: c.desc,
      author: (c.authors ?? []).map((a) => a.name).join(", ") || undefined,
      artist: (c.artists ?? []).map((a) => a.name).join(", ") || undefined,
      genre: (c.md_comic_md_genres ?? []).map((g) => g.md_genres.name),
      status: mapStatus(c.status, c.translation_completed),
      imageUrl: c.default_thumbnail,
      chapters,
    };
  },

  async getPageList(chapterPath): Promise<RawPage[]> {
    // Chapter page (with embedded image JSON) passes CF directly too.
    const res = await flareFetch(`${BASE}/comic/${chapterPath}`, { direct: true });
    if (res.status >= 400) throw new Error(`comick pages ${res.status}`);
    const data = embeddedJson<PageListData>(res.body, "sv-data");
    return (data.chapter?.images ?? []).map((img) => img.url);
  },
};
