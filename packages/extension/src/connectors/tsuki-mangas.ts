import type { MangaConnector, RawDetail, RawListPage, RawPage } from "../types";
import { flareFetch } from "./flare-fetch";

/**
 * Tsuki Mangás — pt-br.
 *
 * **Status: WAF-protected (Sucuri JS challenge).** Direct fetches receive the
 * "Loading…" SPA bootstrap script. FlareSolverr passes the first wall, but
 * the body that arrives next is heavily obfuscated JS that gates the JSON
 * API behind a WebRTC + fingerprint check. Until we wire a real headless
 * browser (Playwright/Puppeteer) or pin a working solver, this connector
 * stays `hasCloudflare: true` and is *excluded from the popular aggregation
 * pool* — it can still be reached via opaque ids for fallback testing.
 *
 * The endpoint shapes below are the documented v2 API; once parsing works,
 * the only thing to flip is `hasCloudflare: false` and bump the timeouts.
 */

const BASE = "https://tsuki-mangas.com";
const API = `${BASE}/api/v2`;

interface TsukiMangaListItem {
  id: number;
  title: string;
  url: string; // slug
  cover?: string;
  image?: string;
}
interface TsukiMangaList {
  data: TsukiMangaListItem[];
  // ... pagination fields
}
interface TsukiMangaDetail {
  id: number;
  title: string;
  url: string;
  cover?: string;
  synopsis?: string;
  author?: string;
  artist?: string;
  status?: string;
  genres?: Array<{ name: string }>;
  chapters?: Array<{
    id: number;
    number: string;
    title?: string;
    scan?: { name: string };
    created_at?: string;
  }>;
}
interface TsukiChapterPages {
  pages: string[];
}

const statusNum = (s?: string): number | undefined => {
  if (!s) return undefined;
  const m: Record<string, number> = {
    "Em Andamento": 0,
    Andamento: 0,
    Completo: 1,
    Finalizado: 1,
    Hiato: 2,
    Cancelado: 3,
  };
  return m[s];
};

export const tsukiMangas: MangaConnector = {
  id: "tsuki-mangas",
  name: "Tsuki Mangás",
  lang: "pt-br",
  baseUrl: BASE,
  iconUrl: `https://www.google.com/s2/favicons?sz=64&domain=tsuki-mangas.com`,
  hasCloudflare: true,
  isNsfw: false,
  featured: false,

  async getPopular(page): Promise<RawListPage> {
    const r = await flareFetch(`${API}/mangas?page=${page}&sort_by=views&order=desc`);
    if (r.status >= 400) throw new Error(`tsuki popular ${r.status}`);
    const data = JSON.parse(r.body) as TsukiMangaList;
    return {
      list: data.data.map((m) => ({
        name: m.title,
        link: String(m.id),
        imageUrl: m.cover ?? m.image,
      })),
      hasNextPage: data.data.length >= 20,
    };
  },

  async search(query, page): Promise<RawListPage> {
    const sp = new URLSearchParams({ query, page: String(page) });
    const r = await flareFetch(`${API}/mangas?${sp}`);
    if (r.status >= 400) throw new Error(`tsuki search ${r.status}`);
    const data = JSON.parse(r.body) as TsukiMangaList;
    return {
      list: data.data.map((m) => ({
        name: m.title,
        link: String(m.id),
        imageUrl: m.cover ?? m.image,
      })),
      hasNextPage: data.data.length >= 20,
    };
  },

  async getDetail(link): Promise<RawDetail> {
    const r = await flareFetch(`${API}/mangas/${link}`);
    if (r.status >= 400) throw new Error(`tsuki detail ${r.status}`);
    const m = JSON.parse(r.body) as TsukiMangaDetail;
    return {
      title: m.title,
      description: m.synopsis,
      author: m.author,
      artist: m.artist,
      status: statusNum(m.status),
      genre: m.genres?.map((g) => g.name),
      imageUrl: m.cover,
      chapters: (m.chapters ?? []).map((c) => ({
        name: c.title ? `Cap. ${c.number} — ${c.title}` : `Cap. ${c.number}`,
        url: String(c.id),
        scanlator: c.scan?.name,
        dateUpload: c.created_at ? String(new Date(c.created_at).getTime()) : undefined,
      })),
    };
  },

  async getPageList(chapterUrl): Promise<RawPage[]> {
    const r = await flareFetch(`${API}/chapter/versions/${chapterUrl}`);
    if (r.status >= 400) throw new Error(`tsuki pages ${r.status}`);
    const data = JSON.parse(r.body) as TsukiChapterPages;
    return data.pages;
  },
};
