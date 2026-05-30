/**
 * Manga Livre (pt-br) — native connectors for the two sites the project tracks.
 * They share a brand but run completely different stacks, so each gets its own
 * parser:
 *
 *   - mangalivre.to   → WordPress + Madara (WP-Manga) theme. Standard Madara
 *     surface: /manga/page/N/?m_orderby=…, /?s=…&post_type=wp-manga, chapters
 *     via POST {mangaUrl}ajax/chapters/, pages in div.reading-content img.
 *   - mangalivre.blog → custom WordPress theme ("b"), fully server-rendered.
 *     Cards are .manga-card, the chapter list is inline on the detail page
 *     (a.chapter-link → /capitulo/{slug}-capitulo-{n}/…), pages are img.chapter-image.
 *
 * For both, `link` is the full manga URL and a chapter `url` is the full chapter
 * URL, so the parser never reconstructs permalinks. Covers/pages are raw upstream
 * URLs; the backend proxies them with `baseUrl` as Referer.
 */
import * as cheerio from "cheerio";
import { flareFetch } from "../shared/flare-fetch";
import type { ConnectorMeta, MangaConnector, RawDetail, RawListPage, RawPage } from "../types";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** pt-br status label → Mangayomi numeric status. */
const mapStatus = (raw: string): number => {
  const s = raw.toLowerCase();
  if (/(em\s*andamento|andamento|lan[çc]ando|em\s*lan[çc]amento|ongoing|ativo|publicando)/.test(s))
    return 0;
  if (/(completo|conclu[íi]do|completed|finalizado|finished)/.test(s)) return 1;
  if (/(hiato|hiatus|pausado)/.test(s)) return 2;
  if (/(cancelado|cancelled|canceled|dropado|droppado)/.test(s)) return 3;
  return 5;
};

type Selection = ReturnType<cheerio.CheerioAPI>;

const imgSrc = (img: Selection): string | undefined =>
  (
    img.attr("data-src") ||
    img.attr("data-lazy-src") ||
    img.attr("srcset")?.split(" ")[0] ||
    img.attr("src") ||
    undefined
  )?.trim();

const fetchHtml = async (url: string): Promise<string> => {
  const res = await flareFetch(url, { headers: { "User-Agent": UA } });
  if (res.status >= 400) throw new Error(`mangalivre ${res.status} ${url}`);
  return res.body;
};

/* ------------------------------------------------------------------ */
/* mangalivre.to — Madara (WP-Manga)                                   */
/* ------------------------------------------------------------------ */

const parseMadaraList = (html: string): RawListPage => {
  const $ = cheerio.load(html);
  const list: NonNullable<RawListPage["list"]> = [];
  $("div.page-item-detail, div.c-tabs-item__content").each((_, el) => {
    const a = $(el).find("h3 a, h4 a, .post-title a, a").first();
    const name = (a.attr("title") || a.text()).trim();
    const link = a.attr("href")?.trim() ?? "";
    if (!name || !link) return;
    list.push({ name, link, imageUrl: imgSrc($(el).find("img").first()) });
  });
  const hasNextPage =
    $("div.nav-previous a, .wp-pagenavi a.nextpostslink, .pagination a.next, a.nextpostslink")
      .length > 0 || list.length >= 12;
  return { list, hasNextPage };
};

const madaraConnector = (meta: ConnectorMeta): MangaConnector => {
  const base = meta.baseUrl.replace(/\/$/, "");
  const list = async (orderby: "views" | "latest", page: number): Promise<RawListPage> =>
    parseMadaraList(await fetchHtml(`${base}/manga/page/${page}/?m_orderby=${orderby}`));

  return {
    ...meta,
    getPopular: (page) => list("views", page),
    getLatestUpdates: (page) => list("latest", page),

    async search(query, page): Promise<RawListPage> {
      const sp = new URLSearchParams({ s: query.trim(), post_type: "wp-manga" });
      return parseMadaraList(await fetchHtml(`${base}/page/${page}/?${sp}`));
    },

    async getDetail(link): Promise<RawDetail> {
      const mangaUrl = link.startsWith("http") ? link : `${base}/manga/${link}/`;
      const $ = cheerio.load(await fetchHtml(mangaUrl));

      const title = $(".post-title h1, .post-title h3, .post-title").first().text().trim();
      const imageUrl = imgSrc($(".summary_image img").first());
      const pick = (label: string) =>
        $(".post-content_item")
          .filter((_, e) => $(e).find(".summary-heading").text().toLowerCase().includes(label))
          .find(".summary-content");
      const author =
        pick("autor")
          .find("a")
          .map((_, a) => $(a).text().trim())
          .get()
          .join(", ") || undefined;
      const artist =
        pick("artista")
          .find("a")
          .map((_, a) => $(a).text().trim())
          .get()
          .join(", ") || undefined;
      const genre = $(".genres-content a")
        .map((_, a) => $(a).text().trim())
        .get()
        .filter(Boolean);
      const status = mapStatus($(".post-status .summary-content").last().text().trim());
      const description =
        $(".description-summary .summary__content, .manga-excerpt, div.summary__content")
          .first()
          .text()
          .trim() || undefined;

      // Chapters: prefer the AJAX endpoint; fall back to whatever is inline.
      let chHtml = await postChaptersHtml(mangaUrl);
      if (!/wp-manga-chapter/.test(chHtml)) chHtml = $.html();
      const $c = cheerio.load(chHtml);
      const chapters: NonNullable<RawDetail["chapters"]> = [];
      $c("li.wp-manga-chapter").each((_, el) => {
        const a = $c(el).find("a").first();
        const name = a.text().trim();
        const url = a.attr("href")?.trim() ?? "";
        if (!name || !url) return;
        const ts = Date.parse($c(el).find(".chapter-release-date").text().trim());
        chapters.push({ name, url, dateUpload: Number.isNaN(ts) ? undefined : String(ts) });
      });

      return { title, description, author, artist, genre, status, imageUrl, chapters };
    },

    async getPageList(chapterUrl): Promise<RawPage[]> {
      const $ = cheerio.load(await fetchHtml(chapterUrl));
      const pages: string[] = [];
      $(".reading-content img.wp-manga-chapter-img, .reading-content img").each((_, el) => {
        const src = imgSrc($(el));
        if (src) pages.push(src);
      });
      return pages;
    },
  };
};

const postChaptersHtml = async (mangaUrl: string): Promise<string> => {
  const url = `${mangaUrl.replace(/\/?$/, "/")}ajax/chapters/`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "User-Agent": UA, "X-Requested-With": "XMLHttpRequest" },
    });
    return res.ok ? res.text() : "";
  } catch {
    return "";
  }
};

/* ------------------------------------------------------------------ */
/* mangalivre.blog — custom theme "b"                                  */
/* ------------------------------------------------------------------ */

const parseBlogList = (html: string): RawListPage => {
  const $ = cheerio.load(html);
  const list: NonNullable<RawListPage["list"]> = [];
  $(".manga-card").each((_, el) => {
    const a = $(el).find("a.manga-card-link, a").first();
    const link = a.attr("href")?.trim() ?? "";
    const name = ($(el).find(".manga-card-title").text() || a.attr("title") || a.text()).trim();
    if (!name || !link) return;
    list.push({ name, link, imageUrl: imgSrc($(el).find("img").first()) });
  });
  const hasNextPage =
    $("a.next.page-numbers, .pagination a.next, a.nextpostslink").length > 0 || list.length >= 20;
  return { list, hasNextPage };
};

const blogConnector = (meta: ConnectorMeta): MangaConnector => {
  const base = meta.baseUrl.replace(/\/$/, "");

  return {
    ...meta,

    getPopular: async (page) =>
      parseBlogList(await fetchHtml(`${base}/manga/page/${page}/?orderby=views`)),
    getLatestUpdates: async (page) =>
      parseBlogList(await fetchHtml(`${base}/manga/page/${page}/?orderby=latest`)),

    async search(query, page): Promise<RawListPage> {
      const sp = new URLSearchParams({ s: query.trim(), post_type: "wp-manga" });
      return parseBlogList(await fetchHtml(`${base}/page/${page}/?${sp}`));
    },

    async getDetail(link): Promise<RawDetail> {
      const mangaUrl = link.startsWith("http") ? link : `${base}/manga/${link}/`;
      const $ = cheerio.load(await fetchHtml(mangaUrl));

      const title = $("h1.manga-title").first().text().trim();
      const imageUrl = imgSrc(
        $("img.wp-post-image, .manga-cover img, .manga-card-image img").first(),
      );
      const genre = $(".manga-tag")
        .map((_, a) => $(a).text().trim())
        .get()
        .filter(Boolean);
      const status = mapStatus($(".manga-status").first().text().trim());
      const description = $(".synopsis-content").first().text().trim() || undefined;

      // Chapters are inline. Derive the number from the /capitulo/…-capitulo-N/ URL.
      const seen = new Set<string>();
      const chapters: NonNullable<RawDetail["chapters"]> = [];
      $("a.chapter-link, a.chapter-grid-link").each((_, el) => {
        const url = $(el).attr("href")?.trim() ?? "";
        if (!url || seen.has(url)) return;
        seen.add(url);
        const num = $(el).find(".chapter-number, .chapter-grid-number").first().text().trim();
        const fromUrl = url.match(/-capitulo-([\d.]+)/i)?.[1];
        const name =
          num || (fromUrl ? `Capítulo ${fromUrl}` : $(el).text().trim().split("\n")[0].trim());
        const ts = Date.parse(
          $(el).find(".chapter-date, .chapter-grid-date").first().text().trim(),
        );
        if (name)
          chapters.push({ name, url, dateUpload: Number.isNaN(ts) ? undefined : String(ts) });
      });

      return { title, description, genre, status, imageUrl, chapters };
    },

    async getPageList(chapterUrl): Promise<RawPage[]> {
      const $ = cheerio.load(await fetchHtml(chapterUrl));
      const pages: string[] = [];
      $("img.chapter-image").each((_, el) => {
        const src = imgSrc($(el));
        if (src) pages.push(src);
      });
      return pages;
    },
  };
};

/* ------------------------------------------------------------------ */

export const mangaLivreTo = madaraConnector({
  id: "mangalivre-to",
  name: "Manga Livre",
  lang: "pt-br",
  baseUrl: "https://mangalivre.to",
  iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=mangalivre.to",
  hasCloudflare: false,
  isNsfw: false,
  featured: true,
});

export const mangaLivreBlog = blogConnector({
  id: "mangalivre-blog",
  name: "Manga Livre (blog)",
  lang: "pt-br",
  baseUrl: "https://mangalivre.blog",
  iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=mangalivre.blog",
  hasCloudflare: false,
  isNsfw: false,
  featured: false,
});
