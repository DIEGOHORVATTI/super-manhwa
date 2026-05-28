import type { MangaConnector, RawDetail, RawListPage, RawPage } from "../types";

/**
 * Reference native connector — NOT exported from `CONNECTORS`. Kept as a
 * worked example of the contract. Copy this file and adapt when adding a
 * real native source. See `README.md` in this directory.
 *
 * This sketch uses a hypothetical JSON API. Pattern with an HTML scrape would
 * swap `fetch(...).json()` for `fetch(...).text()` + `cheerio.load(html)`.
 */
export const exampleConnector: MangaConnector = {
  id: "example",
  name: "Example",
  lang: "pt-br",
  baseUrl: "https://example.com",
  iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=example.com",
  hasCloudflare: false,
  isNsfw: false,

  async getPopular(page): Promise<RawListPage> {
    const res = await fetch(`https://example.com/api/popular?page=${page}`);
    if (!res.ok) throw new Error(`popular ${res.status}`);
    const data = (await res.json()) as {
      items: Array<{ slug: string; title: string; cover?: string }>;
    };
    return {
      list: data.items.map((m) => ({
        name: m.title,
        link: m.slug, // opaque to the backend; passed back on getDetail
        imageUrl: m.cover,
      })),
      hasNextPage: data.items.length >= 20,
    };
  },

  async search(query, page): Promise<RawListPage> {
    const params = new URLSearchParams({ q: query, page: String(page) });
    const res = await fetch(`https://example.com/api/search?${params}`);
    if (!res.ok) throw new Error(`search ${res.status}`);
    const data = (await res.json()) as {
      items: Array<{ slug: string; title: string; cover?: string }>;
    };
    return {
      list: data.items.map((m) => ({ name: m.title, link: m.slug, imageUrl: m.cover })),
      hasNextPage: data.items.length >= 20,
    };
  },

  async getDetail(link): Promise<RawDetail> {
    const res = await fetch(`https://example.com/api/manga/${link}`);
    if (!res.ok) throw new Error(`detail ${res.status}`);
    const m = (await res.json()) as {
      title: string;
      synopsis?: string;
      author?: string;
      tags?: string[];
      status?: "ongoing" | "completed" | "hiatus";
      cover?: string;
      chapters: Array<{ id: string; name: string; uploaded_at?: string }>;
    };
    return {
      title: m.title,
      description: m.synopsis,
      author: m.author,
      genre: m.tags,
      status: m.status === "completed" ? 1 : m.status === "hiatus" ? 2 : 0,
      imageUrl: m.cover,
      chapters: m.chapters.map((c) => ({
        name: c.name,
        url: c.id, // opaque — backend will pass it back to getPageList
        dateUpload: c.uploaded_at ? String(new Date(c.uploaded_at).getTime()) : undefined,
      })),
    };
  },

  async getPageList(chapterUrl): Promise<RawPage[]> {
    const res = await fetch(`https://example.com/api/chapter/${chapterUrl}`);
    if (!res.ok) throw new Error(`pages ${res.status}`);
    const data = (await res.json()) as { pages: string[] };
    return data.pages;
  },
};
