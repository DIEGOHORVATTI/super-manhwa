/**
 * CentralNovel (pt-br) | native connector for https://centralnovel.com.
 *
 * It's a WordPress "Themesia" theme (the manga/novel theme behind classes like
 * `eplister`, `eph-num`, `entry-title`, `genxed`, `spe`) serving **novels**:
 * chapters are prose, not page images. So this is the project's first
 * `format: "novel"` source | it implements `getChapterContent` (text) and its
 * `getPageList` returns `[]`.
 *
 * Layout (verified against the live DOM, Jun 2026):
 *   - series page  /series/<slug>/ : h1.entry-title, cover .thumb img,
 *     synopsis .entry-content[itemprop=description], status/author in .spe,
 *     genres .genxed a, chapter list .eplister ul li a (.epl-num/.epl-title/.epl-date).
 *   - chapter page /<slug>-capitulo-<n>/ : prose in .epcontent.entry-content.
 *   - search       /?s=<q>            : result cards .listupd .bs .bsx > a (.tt title).
 *
 * `link` is the full series URL and a chapter `url` is the full chapter URL, so
 * the parser never rebuilds permalinks. ponytail: selectors are theme-specific;
 * if CentralNovel reskins, this one file is the patch site (mirrors mangalivre.ts).
 */
import * as cheerio from "cheerio";
import { flareFetch, flareFetchJson } from "../shared/flare-fetch";
import type { MangaConnector, RawChapterContent, RawDetail, RawListPage, RawPage } from "../types";

const BASE = "https://centralnovel.com";
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** pt-br status label → Mangayomi numeric status (mapped to our enum backend-side). */
const mapStatus = (raw: string): number => {
  const s = raw.toLowerCase();
  if (/(em\s*andamento|andamento|lan[çc]ando|ongoing|ativo|publicando)/.test(s)) return 0;
  if (/(completo|conclu[íi]do|completed|finalizado|finished)/.test(s)) return 1;
  if (/(hiato|hiatus|pausado)/.test(s)) return 2;
  if (/(cancelado|cancelled|canceled|dropado)/.test(s)) return 3;
  return 5;
};

type Selection = ReturnType<cheerio.CheerioAPI>;

const imgSrc = (img: Selection): string | undefined =>
  (
    img.attr("data-src") ||
    img.attr("data-lazy-src") ||
    img.attr("src") ||
    img.attr("srcset")?.split(" ")[0] ||
    undefined
  )?.trim();

// CentralNovel answers a plain browser fetch (no Cloudflare): `direct` skips the
// FlareSolverr round-trip. A 429/5xx throws so the aggregator falls back.
const fetchHtml = async (url: string): Promise<string> => {
  const res = await flareFetch(url, { direct: true, headers: { "User-Agent": UA } });
  if (res.status === 429) throw new Error(`centralnovel rate-limited ${url}`);
  if (res.status >= 400) throw new Error(`centralnovel ${res.status} ${url}`);
  return res.body;
};

/**
 * Themesia listing parser. Two layouts share `.listupd`:
 *   - search results : <article class="maindet"> … <a class="tip" title=… href=/series/…>
 *   - browse/grid     : <div class="bsx"> <a href=/series/… title=…> … <div class="tt">…
 * We accept both | the anchor's `title` attr is the reliable name, the `.tt`
 * span is the grid fallback. Only `/series/` hrefs count (skips chapter/genre links).
 */
const parseCardList = (html: string): RawListPage => {
  const $ = cheerio.load(html);
  const list: NonNullable<RawListPage["list"]> = [];
  const seen = new Set<string>();
  $(".listupd .bsx > a, .listupd .maindet a.tip, .listupd article a.tip").each((_, el) => {
    const a = $(el);
    const link = a.attr("href")?.trim() ?? "";
    if (!link || !/\/series\//.test(link) || seen.has(link)) return;
    const name = (a.attr("title") || a.find(".tt").first().text() || a.text()).trim();
    if (!name) return;
    seen.add(link);
    list.push({ name, link, imageUrl: imgSrc(a.find("img").first()) });
  });
  const hasNextPage = $("a.next.page-numbers, .hpage a.r").length > 0;
  return { list, hasNextPage };
};

export const centralnovel: MangaConnector = {
  id: "centralnovel",
  name: "Central Novel",
  format: "novel",
  langs: ["pt-br"],
  baseUrl: BASE,
  iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=centralnovel.com",
  hasCloudflare: false,
  isNsfw: false,
  featured: false,

  async getPopular(page): Promise<RawListPage> {
    return parseCardList(await fetchHtml(`${BASE}/series/?page=${page}&order=popular`));
  },

  async getLatestUpdates(page): Promise<RawListPage> {
    return parseCardList(await fetchHtml(`${BASE}/series/?page=${page}&order=update`));
  },

  // WP REST search | ~1s JSON, vs ~5s for the 130KB HTML results page (too slow
  // for the autocomplete deadline). No cover here (the detail page fetches it).
  async search(query, _page): Promise<RawListPage> {
    // `subtype` query param only accepts post/page/category/post_tag/any | we
    // pass `any` and filter the response (each row carries its real `subtype`,
    // which is `series` for works).
    const sp = new URLSearchParams({
      search: query.trim(),
      subtype: "any",
      per_page: "12",
      _fields: "title,url,subtype",
    });
    try {
      const data = await flareFetchJson<Array<{ title?: string; url?: string; subtype?: string }>>(
        `${BASE}/wp-json/wp/v2/search?${sp}`,
        { direct: true, headers: { "User-Agent": UA } },
      );
      const list = (Array.isArray(data) ? data : [])
        .filter((d) => d.subtype === "series" && d.title && d.url)
        .map((d) => ({ name: d.title as string, link: d.url as string }));
      return { list, hasNextPage: false };
    } catch {
      // Fall back to scraping the HTML results page if the REST route is blocked.
      return parseCardList(await fetchHtml(`${BASE}/?s=${encodeURIComponent(query.trim())}`));
    }
  },

  async getDetail(link): Promise<RawDetail> {
    const seriesUrl = link.startsWith("http") ? link : `${BASE}/series/${link}/`;
    const $ = cheerio.load(await fetchHtml(seriesUrl));

    const title = $("h1.entry-title").first().text().trim();
    const imageUrl = imgSrc($(".thumb img, .thumbook .thumb img").first());
    const description =
      $(".entry-content[itemprop=description], .synp .entry-content").first().text().trim() ||
      undefined;
    const genre = $(".genxed a, .mgen a")
      .map((_, a) => $(a).text().trim())
      .get()
      .filter(Boolean);

    // `.spe` holds "Status: …", "Autor: …" as plain label/value spans.
    const speText = $(".spe").first().text();
    const author = /Autor:\s*([^\n]+?)(?:\s{2,}|\n|Lançamento|$)/i.exec(speText)?.[1]?.trim();
    const statusLabel = /Status:\s*([^\n]+?)(?:\s{2,}|\n|Tipo|$)/i.exec(speText)?.[1]?.trim() ?? "";
    const status = mapStatus(statusLabel);

    // Chapter list: the Themesia `.eplister` rows; fall back to any in-page
    // chapter permalink so a theme tweak doesn't drop the whole list.
    const seen = new Set<string>();
    const chapters: NonNullable<RawDetail["chapters"]> = [];
    const rows = $("#chapterlist li a, .eplister ul li a");
    const anchors = rows.length > 0 ? rows : $('a[href*="-capitulo-"]');
    anchors.each((_, el) => {
      const a = $(el);
      const url = a.attr("href")?.trim() ?? "";
      // Each chapter has TWO links: the reader (`…-capitulo-N/`) and a PDF
      // download (`…-capitulo-N/pdf/`). Skip the PDF | it's the dateless dupe
      // that has no readable pages. Key the dedupe by chapter number so the two
      // never both land even if markup shifts.
      if (!url || /\/pdf\/?$/i.test(url)) return;
      const fromUrl = /-capitulo-([\d.]+)/i.exec(url)?.[1];
      if (!fromUrl || seen.has(fromUrl)) return;
      seen.add(fromUrl);
      const ts = Date.parse(a.find(".epl-date").first().text().trim());
      // Number from the URL is the reliable label (the `.epl-num` text is
      // "Vol. X Cap. Y", which would mis-parse to the volume number).
      chapters.push({
        name: `Capítulo ${fromUrl}`,
        url,
        dateUpload: Number.isNaN(ts) ? undefined : String(ts),
      });
    });

    return { title, description, author, genre, status, imageUrl, chapters };
  },

  // Novels have no page images | the reader uses getChapterContent instead.
  async getPageList(): Promise<RawPage[]> {
    return [];
  },

  async getChapterContent(chapterUrl): Promise<RawChapterContent> {
    const $ = cheerio.load(await fetchHtml(chapterUrl));
    const body = $(".epcontent.entry-content, #readerarea, .epcontent").first();
    body.find("script, style, .code-block, .ai-viewports, ins").remove();
    const html = body.html()?.trim() ?? "";
    if (!html) throw new Error(`centralnovel: empty chapter ${chapterUrl}`);
    const title = $("h1.entry-title").first().text().trim() || undefined;
    return { html, title };
  },
};
