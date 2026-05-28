import * as cheerio from "cheerio";

import type { MangaConnector, RawDetail, RawListPage, RawPage } from "../types";
import { flareFetch } from "./flare-fetch";

/**
 * Mangás Yabu — pt-br.
 *
 * **Status: ad-injection redirect even through FlareSolverr.** The site
 * serves `<title>Redirecting…</title>` interstitials that a bare solver
 * doesn't follow through (the redirects depend on cookies + UA fingerprints
 * the solver doesn't fully replay). Plain Cloudflare-style challenges aren't
 * the blocker — it's the layer above.
 *
 * The site is WordPress underneath; the parser below targets the standard
 * Mangayomi-WP conventions (`.bsx`, `.tt`, `.eph-num` etc.). When/if a real
 * browser layer lands and we can follow the redirects, the connector should
 * start returning data without further changes.
 */

const BASE = "https://mangayabu.top";

interface ParsedListPage {
  list: Array<{ name: string; link: string; imageUrl?: string }>;
  hasNextPage: boolean;
}

const parseListPage = (html: string, baseHost: string): ParsedListPage => {
  const $ = cheerio.load(html);
  const list: ParsedListPage["list"] = [];

  $(".bsx > a, .listupd .bs .bsx > a").each((_, el) => {
    const a = $(el);
    const href = a.attr("href") ?? "";
    const name = a.attr("title") ?? a.find(".tt").first().text().trim();
    const imageUrl =
      a.find("img").attr("data-src") ||
      a.find("img").attr("src") ||
      a.find("img").attr("data-lazy-src");
    if (href && name) list.push({ name, link: href.replace(baseHost, ""), imageUrl });
  });

  const hasNextPage = /class="r"|class="next"|>next</i.test(html);
  return { list, hasNextPage };
};

export const mangasYabu: MangaConnector = {
  id: "mangas-yabu",
  name: "Mangás Yabu",
  lang: "pt-br",
  baseUrl: BASE,
  iconUrl: `https://www.google.com/s2/favicons?sz=64&domain=mangayabu.top`,
  hasCloudflare: true,
  isNsfw: false,
  featured: false,

  async getPopular(page): Promise<RawListPage> {
    const r = await flareFetch(`${BASE}/manga/?page=${page}&order=popular`);
    if (r.status >= 400) throw new Error(`yabu popular ${r.status}`);
    return parseListPage(r.body, BASE);
  },

  async search(query, page): Promise<RawListPage> {
    const sp = new URLSearchParams({ s: query, paged: String(page) });
    const r = await flareFetch(`${BASE}/?${sp}`);
    if (r.status >= 400) throw new Error(`yabu search ${r.status}`);
    return parseListPage(r.body, BASE);
  },

  async getDetail(link): Promise<RawDetail> {
    const url = link.startsWith("http") ? link : `${BASE}${link}`;
    const r = await flareFetch(url);
    if (r.status >= 400) throw new Error(`yabu detail ${r.status}`);
    const $ = cheerio.load(r.body);

    const chapters: NonNullable<RawDetail["chapters"]> = [];
    $("#chapterlist li, .eplister li").each((_, el) => {
      const a = $(el).find("a").first();
      const href = a.attr("href") ?? "";
      const name =
        $(el).find(".chapternum").text().trim() ||
        $(el).find(".eph-num").text().trim() ||
        a.text().trim();
      const dateText = $(el).find(".chapterdate").text().trim();
      if (href && name) {
        const t = Date.parse(dateText);
        chapters.push({
          name,
          url: href.replace(BASE, ""),
          dateUpload: Number.isNaN(t) ? undefined : String(t),
        });
      }
    });

    return {
      title: $(".seriestuheader h1, .entry-title").first().text().trim() || undefined,
      description:
        $(".entry-content p, [itemprop='description']").first().text().trim() || undefined,
      author: $(".infotable td:contains('Autor') + td, .author").first().text().trim() || undefined,
      genre: $(".seriestugenre a, .genxed a")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(Boolean),
      imageUrl:
        $(".thumb img, .seriestucontentr img").attr("data-src") ||
        $(".thumb img, .seriestucontentr img").attr("src") ||
        undefined,
      chapters,
    };
  },

  async getPageList(chapterUrl): Promise<RawPage[]> {
    const url = chapterUrl.startsWith("http") ? chapterUrl : `${BASE}${chapterUrl}`;
    const r = await flareFetch(url);
    if (r.status >= 400) throw new Error(`yabu pages ${r.status}`);

    // Common Mangayomi-style pattern: an inline `ts_reader.run({ ... sources: [{ images: [...] }] })` blob.
    const match = r.body.match(/ts_reader\.run\(({[\s\S]*?})\);/);
    if (match) {
      try {
        const data = JSON.parse(match[1]) as { sources?: Array<{ images?: string[] }> };
        return data.sources?.[0]?.images ?? [];
      } catch {
        /* fall through */
      }
    }
    // Fallback: scrape <img> from the reader container.
    const $ = cheerio.load(r.body);
    return $("#readerarea img, .ts-main-image img, .reading-content img")
      .map(
        (_, el) => $(el).attr("data-src") || $(el).attr("data-lazy-src") || $(el).attr("src") || "",
      )
      .get()
      .filter(Boolean);
  },
};
