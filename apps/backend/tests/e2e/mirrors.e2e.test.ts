import { describe, expect, it } from "bun:test";

import {
  CONNECTORS,
  type MangaConnector,
  type RawDetail,
  type RawListPage,
} from "@packages/extension";

import { httpFetch } from "@/shared/http-fetch";

/**
 * Mirror validation suite — exercises each curated connector directly through
 * its typed methods (no QuickJS dispatch, no raw codeUrls). Asserts:
 *
 *   - getPopular() yields ≥ 2 items with the required shape
 *   - search() returns ≥ 1 hit for an iconic query
 *   - getDetail() yields chapters for at least 2 different popular titles
 *
 * Connectors whose upstream extension is broken in a way we can't recover
 * from are documented in the KNOWN_*_FAILURES sets below; their tests are
 * skipped (not removed) so the failure mode stays visible.
 */

const NON_CF_CONNECTORS: readonly MangaConnector[] = CONNECTORS.filter((c) => !c.hasCloudflare);

/**
 * Connectors that route every request through FlareSolverr even though they
 * carry `hasCloudflare: false` (the flag means "behind an active CF challenge",
 * which these sites are not — yet the connectors fetch defensively via the
 * solver). A solver round-trip renders a headless Chromium, so the *dynamic*
 * WordPress search route (`/?s=…`, uncached) measures ~18 s end-to-end — well
 * past the direct-fetch search budget. They get an extended search timeout so
 * the suite reflects real solver latency instead of flaking on a deadline.
 */
const SOLVER_ROUTED = new Set<string>(["mangalivre-to", "mangalivre-blog"]);

const KNOWN_SEARCH_FAILURES = new Set<string>([
  "weebcentral", // extension throws "cannot read property 'text' of null"
  "webtoons", // search consistently returns 0 hits even for catalog titles
]);
const KNOWN_DETAIL_FAILURES = new Set<string>([
  "webtoons", // getDetail throws "cannot read property 'selectFirst' of null"
  "weebcentral", // selector chain throws on detail page too
]);

const ICONIC_QUERY: Record<string, string> = {
  mangadex: "one piece",
  "mangadex-ptbr": "one piece",
  manhwaz: "solo leveling",
  webtoons: "tower of god",
  mangaworld: "one piece",
  weebcentral: "one piece",
};
const DEFAULT_QUERY = "one piece";

const POPULAR_TIMEOUT_MS = 20_000;
const SEARCH_TIMEOUT_MS = 15_000;
const DETAIL_TIMEOUT_MS = 25_000;
/**
 * Solver-routed connectors render a headless Chromium for every request, so
 * each call costs ~18 s on its own and more under load (the solver serializes).
 * Their popular/search budgets are widened accordingly — direct-fetch mirrors
 * keep the tight budgets so a real perf regression there still fails.
 */
const SOLVER_POPULAR_TIMEOUT_MS = 30_000;
const SOLVER_SEARCH_TIMEOUT_MS = 30_000;

const popularTimeout = (id: string) =>
  (SOLVER_ROUTED.has(id) ? SOLVER_POPULAR_TIMEOUT_MS : POPULAR_TIMEOUT_MS) + 2_000;
const searchTimeout = (id: string) =>
  (SOLVER_ROUTED.has(id) ? SOLVER_SEARCH_TIMEOUT_MS : SEARCH_TIMEOUT_MS) + 2_000;

describe("mirrors / per-connector contract", () => {
  for (const c of NON_CF_CONNECTORS) {
    describe(`connector: ${c.id}`, () => {
      it("metadata has the fields the backend needs", () => {
        expect(c.id).toBeTruthy();
        expect(c.name).toBeTruthy();
        expect(c.lang).toBeTruthy();
        expect(c.baseUrl).toMatch(/^https?:\/\//);
        expect(typeof c.hasCloudflare).toBe("boolean");
        expect(typeof c.isNsfw).toBe("boolean");
      });

      it(
        "getPopular returns >= 2 items with the required shape",
        async () => {
          const r: RawListPage = await c.getPopular(1);
          const list = r.list ?? [];
          expect(list.length).toBeGreaterThanOrEqual(2);
          for (const m of list.slice(0, 2)) {
            expect(typeof m.name).toBe("string");
            expect(typeof m.link).toBe("string");
            expect(m.name.length).toBeGreaterThan(0);
            expect(m.link.length).toBeGreaterThan(0);
          }
        },
        popularTimeout(c.id),
      );

      if (!KNOWN_SEARCH_FAILURES.has(c.id)) {
        it(
          "search returns at least 1 hit for an iconic query",
          async () => {
            const q = ICONIC_QUERY[c.id] ?? DEFAULT_QUERY;
            const r: RawListPage = await c.search(q, 1);
            expect((r.list ?? []).length).toBeGreaterThanOrEqual(1);
          },
          searchTimeout(c.id),
        );
      } else {
        it.skip(`search is known broken upstream (id=${c.id}); skipped`, () => {});
      }

      if (!KNOWN_DETAIL_FAILURES.has(c.id)) {
        it(
          "getDetail yields chapters for at least 2 different popular titles",
          async () => {
            const popular = await c.getPopular(1);
            // Sample top 10 to be robust against DMCA-blocked iconic titles.
            const picks = (popular.list ?? []).slice(0, 10);
            expect(picks.length).toBeGreaterThanOrEqual(2);

            const succeeded: Array<{ name: string; chapters: RawDetail["chapters"] }> = [];
            for (const m of picks) {
              if (succeeded.length >= 2) break;
              try {
                const det: RawDetail = await c.getDetail(m.link);
                if ((det.chapters ?? []).length > 0) {
                  succeeded.push({ name: m.name, chapters: det.chapters });
                }
              } catch {
                /* tolerate per-title stale-selector errors */
              }
            }

            expect(succeeded.length).toBeGreaterThanOrEqual(2);
            for (const s of succeeded) {
              const chapters = s.chapters ?? [];
              expect(chapters.length).toBeGreaterThan(0);
              for (const ch of chapters.slice(0, 3)) {
                expect(typeof ch.name).toBe("string");
                expect(typeof ch.url).toBe("string");
                expect(ch.name.length).toBeGreaterThan(0);
                expect(ch.url.length).toBeGreaterThan(0);
              }
            }
          },
          DETAIL_TIMEOUT_MS * 10,
        );
      } else {
        it.skip(`getDetail is known broken upstream (id=${c.id}); skipped`, () => {});
      }
    });
  }
});

/**
 * "Can we add a new mirror?" — the dynamic-resolution path. We don't directly
 * invoke `resolveConnector` here because that would download a fresh JS file
 * per test. Just validate the upstream index is fetchable + well-shaped, the
 * contract a new entry would need to satisfy.
 */
describe("mirrors / adding a new mirror (upstream index)", () => {
  interface UpstreamEntry {
    id: number;
    name: string;
    lang: string;
    sourceCodeUrl: string;
    sourceCodeLanguage: number;
    itemType: number;
  }

  it("upstream index.json is fetchable and well-formed", async () => {
    const r = await httpFetch<UpstreamEntry[]>(
      "https://kodjodevf.github.io/mangayomi-extensions/index.json",
    );
    if (r.error) throw new Error(`index fetch failed: ${r.error.message}`);
    expect(Array.isArray(r.value)).toBe(true);
    expect(r.value.length).toBeGreaterThan(50);
    const jsManga = r.value.filter((e) => e.sourceCodeLanguage === 1 && e.itemType === 0);
    expect(jsManga.length).toBeGreaterThan(30);
    for (const e of jsManga.slice(0, 10)) {
      expect(typeof e.id).toBe("number");
      expect(typeof e.name).toBe("string");
      expect(typeof e.lang).toBe("string");
      expect(e.sourceCodeUrl).toMatch(/^https?:\/\//);
    }
  });
});
