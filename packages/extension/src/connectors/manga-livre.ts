import type { MangaConnector, RawDetail, RawListPage, RawPage } from "../types";
import { flareFetch } from "./flare-fetch";

/**
 * MangaLivre — pt-br.
 *
 * **Status: SPA, no server-rendered content.** Every URL returns the same
 * 14kB shell HTML; data is fetched client-side after a session cookie is
 * established. FlareSolverr doesn't help because there's no challenge to
 * solve — the server simply doesn't render content without the SPA running.
 *
 * To make this work we need a real browser (Playwright/Puppeteer) that
 * executes the JS and exposes the page's network calls — that's the same
 * infrastructure the BR launch will eventually want for Tsuki and Yabu, so
 * the scaffold here documents the planned wire-up.
 *
 * Until then: `hasCloudflare: true` keeps this off the popular pool.
 */

const BASE = "https://mangalivre.net";

export const mangaLivre: MangaConnector = {
  id: "manga-livre",
  name: "MangaLivre",
  lang: "pt-br",
  baseUrl: BASE,
  iconUrl: `https://www.google.com/s2/favicons?sz=64&domain=mangalivre.net`,
  hasCloudflare: true,
  isNsfw: false,
  featured: false,

  async getPopular(page): Promise<RawListPage> {
    // The actual production endpoint MangaLivre's SPA hits after warm-up. Not
    // reachable from a vanilla fetch — needs a session cookie + the JS having
    // run. Documented here so a future Puppeteer-backed `flareFetch` swap
    // would Just Work.
    const r = await flareFetch(`${BASE}/series-mais-lidos/${page}`, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    if (r.status >= 400 || r.body.length < 5_000) {
      throw new Error("mangalivre popular: needs full-browser execution");
    }
    // Server doesn't render the grid; the JSON is dynamically injected by the
    // SPA. Without a real browser we can't reliably extract items. Return an
    // empty list rather than guessing — the aggregator tolerates this and
    // moves on to other connectors.
    return { list: [], hasNextPage: false };
  },

  async search(query, _page): Promise<RawListPage> {
    const r = await flareFetch(
      `${BASE}/lib/search/series.json?search=${encodeURIComponent(query)}`,
      {
        headers: { "X-Requested-With": "XMLHttpRequest", Referer: `${BASE}/` },
      },
    );
    if (r.status >= 400) throw new Error(`mangalivre search ${r.status}`);
    // Same SPA constraint — leave the parser as a stub for now.
    return { list: [], hasNextPage: false };
  },

  async getDetail(link): Promise<RawDetail> {
    const r = await flareFetch(`${BASE}/series/${link}`);
    if (r.status >= 400) throw new Error(`mangalivre detail ${r.status}`);
    // TODO: parse the SPA-rendered HTML once a real browser executes the JS.
    return { title: link };
  },

  async getPageList(_chapterUrl): Promise<RawPage[]> {
    throw new Error("mangalivre pages: needs full-browser execution");
  },
};
