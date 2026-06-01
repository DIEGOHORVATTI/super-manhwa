import * as cheerio from "cheerio";

import type { MangaConnector, RawDetail, RawListPage, RawPage } from "../types";
import { generateVrf } from "./mangafire-vrf";

/**
 * Mangafire (pt-br) — NATIVE connector against mangafire.to.
 *
 * Mangafire has no WAF (plain fetch reaches it), but signs search/detail/page
 * requests with a `vrf` token. The Mangayomi-vendored extension computes that
 * token fine in a real engine but throws under our QuickJS sandbox (arrow
 * class-fields don't initialise). So we run natively: fetch + cheerio here,
 * and reuse the extension's exact `generate_vrf` via `./mangafire-vrf` (loaded
 * in Bun, where it works). No FlareSolverr, no container — just native JS.
 *
 * VALIDATED (2026-05): search "solo leveling" → 30 hits; getDetail
 * (solo-levelingg.52x0) → 201 pt-br chapters; getPageList → real CDN images.
 *
 * `hasCloudflare: true` keeps it OUT of the popular pool for now (its /filter
 * trending list mixes languages); it serves as a fallback/detail target by id.
 */

const BASE = "https://mangafire.to";
const LANG = "pt-br";
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const get = async (url: string, extra?: Record<string, string>): Promise<Response> => {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, ...extra },
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status >= 400) throw new Error(`mangafire ${res.status} ${url}`);
  return res;
};

/** Parse a /filter results page (div.unit cards). */
const parseUnits = (html: string): RawListPage => {
  const $ = cheerio.load(html);
  const list: NonNullable<RawListPage["list"]> = [];
  $("div.unit").each((_, el) => {
    const a = $(el).find("div.info > a").first();
    const name = a.text().trim();
    const link = $(el).find("a").attr("href") ?? "";
    const img = $(el).find("img");
    const imageUrl = img.attr("data-src") || img.attr("src") || undefined;
    if (name && link) list.push({ name, link, imageUrl });
  });
  return { list, hasNextPage: $("li.page-item.active + li").length > 0 };
};

const STATUS: Record<string, number> = {
  Releasing: 0,
  Completed: 1,
  On_Hiatus: 2,
  Discontinued: 3,
  Unrealeased: 4,
};

export const mangafirePtBr: MangaConnector = {
  id: "mangafire-ptbr",
  name: "Mangafire (pt-br)",
  lang: LANG,
  baseUrl: BASE,
  iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=mangafire.to",
  hasCloudflare: true,
  isNsfw: false,
  featured: false,

  async getPopular(page): Promise<RawListPage> {
    const res = await get(`${BASE}/filter?language=${LANG}&sort=trending&page=${page}`);
    return parseUnits(await res.text());
  },

  async search(query, page): Promise<RawListPage> {
    const vrf = await generateVrf(query);
    const sp = new URLSearchParams({ keyword: query, language: LANG, page: String(page), vrf });
    const res = await get(`${BASE}/filter?${sp}`);
    return parseUnits(await res.text());
  },

  async getDetail(link): Promise<RawDetail> {
    const path = link.startsWith("http") ? link.replace(BASE, "") : link;
    const id = path.split(".").pop() ?? "";

    // 1. Info page (HTML).
    const infoHtml = await (await get(`${BASE}${path}`)).text();
    const $ = cheerio.load(infoHtml);
    const info = $("div.info");
    const sidebar = $("aside.sidebar div.meta div");
    const title = info.find("h1").first().text().trim();
    const statusText = info.find("p").first().text().trim();
    const cover = $("div.poster img").attr("src") || undefined;
    const author = sidebar.eq(0).find("a").first().text().trim() || undefined;
    const description = $("div#synopsis").text().trim() || undefined;
    const genre = sidebar
      .eq(2)
      .find("a")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean);

    // 2. Chapter list (signed ajax → JSON with embedded HTML). The /ajax/read
    //    view carries the chapter ids; the upload date lives only in the
    //    /ajax/manga view (same vrf), matched per chapter by `data-number`.
    const vrf = await generateVrf(`${id}@chapter@${LANG}`);
    const sign = (v: string) => encodeURIComponent(v);
    const chRes = await get(`${BASE}/ajax/read/${id}/chapter/${LANG}?vrf=${sign(vrf)}`, {
      "X-Requested-With": "XMLHttpRequest",
    });
    const chJson = (await chRes.json()) as { result?: { html?: string } };
    const $ch = cheerio.load(chJson.result?.html ?? "");

    // Best-effort date map (chapter number → unix ms). A failure here just
    // leaves chapters dateless — the ids above are what actually drive reading.
    const dateByNo = new Map<string, string>();
    try {
      const dRes = await get(`${BASE}/ajax/manga/${id}/chapter/${LANG}?vrf=${sign(vrf)}`, {
        "X-Requested-With": "XMLHttpRequest",
      });
      const dJson = (await dRes.json()) as { result?: string };
      const $d = cheerio.load(dJson.result ?? "");
      $d("li.item").each((_, el) => {
        const no = $d(el).attr("data-number");
        const ts = Date.parse($d(el).find("span").eq(1).text().trim()); // e.g. "Nov 19, 2025"
        if (no && !Number.isNaN(ts)) dateByNo.set(no, String(ts));
      });
    } catch {
      /* date is enrichment only */
    }

    const chapters: NonNullable<RawDetail["chapters"]> = [];
    $ch("a").each((_, el) => {
      const name = $ch(el).text().trim();
      const chapId = $ch(el).attr("data-id");
      const no = $ch(el).attr("data-number");
      if (name && chapId) {
        chapters.push({ name, url: chapId, dateUpload: no ? dateByNo.get(no) : undefined });
      }
    });

    return {
      title,
      description,
      author,
      genre,
      status: STATUS[statusText] ?? 5,
      imageUrl: cover,
      chapters,
    };
  },

  async getPageList(chapId): Promise<RawPage[]> {
    const vrf = await generateVrf(`chapter@${chapId}`);
    const res = await get(`${BASE}/ajax/read/chapter/${chapId}?vrf=${encodeURIComponent(vrf)}`, {
      "X-Requested-With": "XMLHttpRequest",
    });
    const json = (await res.json()) as {
      result?: { images?: Array<[string, ...unknown[]]> };
    };
    return (json.result?.images ?? []).map((img) => img[0]).filter(Boolean);
  },
};
