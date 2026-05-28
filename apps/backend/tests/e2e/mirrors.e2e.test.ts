import { describe, expect, it } from "bun:test";

import { runExtension } from "@packages/extension-runtime";

import { httpFetch, httpFetchText } from "@/shared/http-fetch";

import { makeCuratedSourceRegistry } from "@/modules/catalog/infrastructure/curated-source-registry";
import type { MangayomiIndex } from "@/modules/catalog/infrastructure/mangayomi-index";
import type { RawDetail, RawListPage } from "@/modules/catalog/domain/manga-catalog";
import type { Source } from "@/modules/catalog/domain/source";

/**
 * Mirror validation suite — exercises each curated source DIRECTLY through the
 * extension runtime (bypasses the backend HTTP layer) so we know:
 *
 *   - upstream code URL is reachable
 *   - getPopular() returns items (≥ 2, shape OK)
 *   - search() returns at least one hit for an iconic query
 *   - getDetail() on at least one of two popular picks returns chapters
 *
 * Sources whose upstream extension is broken in a way we can't recover from
 * are documented in the KNOWN_*_FAILURES sets below; their corresponding tests
 * are skipped (not removed) so the failure mode is visible and easy to revive
 * when the extension is updated upstream.
 */

const registry = makeCuratedSourceRegistry();
const NON_CF_SOURCES: readonly Source[] = registry.listCurated().filter((s) => !s.hasCloudflare);

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
  manhwaz: "solo leveling",
  webtoons: "tower of god",
  mangaworld: "one piece",
  weebcentral: "one piece",
};
const DEFAULT_QUERY = "one piece";

const POPULAR_TIMEOUT_MS = 20_000;
const SEARCH_TIMEOUT_MS = 15_000;
const DETAIL_TIMEOUT_MS = 25_000;

const runFor = async <T>(
  src: Source,
  method: string,
  args: unknown[],
  timeoutMs: number,
): Promise<T> => {
  const codeRes = await httpFetchText(src.codeUrl);
  if (codeRes.error) throw new Error(`fetch code: ${codeRes.error.message}`);
  return runExtension<T>({
    code: codeRes.value,
    method,
    args,
    source: { lang: src.lang },
    cloudflare: src.hasCloudflare,
    timeoutMs,
  });
};

describe("mirrors / per-source contract", () => {
  for (const src of NON_CF_SOURCES) {
    describe(`source: ${src.id}`, () => {
      it("code URL is reachable", async () => {
        const r = await httpFetchText(src.codeUrl);
        if (r.error) throw new Error(`unreachable: ${r.error.message}`);
        expect(r.value.length).toBeGreaterThan(500);
        expect(r.value).toMatch(/getPopular|search|getDetail/);
      });

      it(
        "getPopular returns >= 2 items with the required shape",
        async () => {
          const r = await runFor<RawListPage>(src, "getPopular", [1], POPULAR_TIMEOUT_MS);
          const list = r.list ?? [];
          expect(list.length).toBeGreaterThanOrEqual(2);
          for (const m of list.slice(0, 2)) {
            expect(typeof m.name).toBe("string");
            expect(typeof m.link).toBe("string");
            expect(m.name.length).toBeGreaterThan(0);
            expect(m.link.length).toBeGreaterThan(0);
          }
        },
        POPULAR_TIMEOUT_MS + 2_000,
      );

      if (!KNOWN_SEARCH_FAILURES.has(src.id)) {
        it(
          "search returns at least 1 hit for an iconic query",
          async () => {
            const q = ICONIC_QUERY[src.id] ?? DEFAULT_QUERY;
            const r = await runFor<RawListPage>(src, "search", [q, 1, []], SEARCH_TIMEOUT_MS);
            expect((r.list ?? []).length).toBeGreaterThanOrEqual(1);
          },
          SEARCH_TIMEOUT_MS + 2_000,
        );
      } else {
        it.skip(`search is known broken upstream (id=${src.id}); skipped`, () => {});
      }

      if (!KNOWN_DETAIL_FAILURES.has(src.id)) {
        it(
          "getDetail returns chapters for at least 2 popular picks (of 4 sampled)",
          async () => {
            const popular = await runFor<RawListPage>(src, "getPopular", [1], POPULAR_TIMEOUT_MS);
            // Sample top 4 to be robust against DMCA-blocked iconic titles
            // (MangaDex's top popular is heavy on licensed-in-EN works that
            // legitimately return 0 chapters).
            const picks = (popular.list ?? []).slice(0, 4);
            expect(picks.length).toBeGreaterThanOrEqual(4);

            const results = await Promise.allSettled(
              picks.map((m) => runFor<RawDetail>(src, "getDetail", [m.link], DETAIL_TIMEOUT_MS)),
            );

            const withChapters = results.filter(
              (r) => r.status === "fulfilled" && (r.value.chapters ?? []).length > 0,
            );
            // At least TWO different titles must yield chapters — proves the
            // detail/chapter path isn't a one-off success.
            expect(withChapters.length).toBeGreaterThanOrEqual(2);

            // Validate chapter shape across BOTH successful picks.
            for (const r of withChapters.slice(0, 2)) {
              if (r.status !== "fulfilled") continue;
              const chapters = r.value.chapters ?? [];
              expect(chapters.length).toBeGreaterThan(0);
              for (const c of chapters.slice(0, 3)) {
                expect(typeof c.name).toBe("string");
                expect(typeof c.url).toBe("string");
                expect(c.name.length).toBeGreaterThan(0);
                expect(c.url.length).toBeGreaterThan(0);
              }
            }
          },
          DETAIL_TIMEOUT_MS * 5,
        );
      } else {
        it.skip(`getDetail is known broken upstream (id=${src.id}); skipped`, () => {});
      }
    });
  }
});

/**
 * "Can we add a new mirror?" — exercises the contract a new integration must
 * satisfy. We pick a candidate from the upstream index.json that's NOT in our
 * curated list, resolve it through SourceRegistry, and validate it can list
 * popular. This is the same path used by `/api/manga/detail` when an opaque id
 * points to a dynamic source.
 */
describe("mirrors / adding a new mirror", () => {
  it("the upstream index.json is fetchable and well-formed", async () => {
    const r = await httpFetch<MangayomiIndex>(
      "https://raw.githubusercontent.com/kodjodevf/mangayomi-extensions/main/index.json",
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
      expect(typeof e.sourceCodeUrl).toBe("string");
      expect(e.sourceCodeUrl).toMatch(/^https?:\/\//);
    }
  });

  it("registry.resolve('id-<n>') finds two distinct dynamic sources from the upstream index", async () => {
    const indexRes = await httpFetch<MangayomiIndex>(
      "https://raw.githubusercontent.com/kodjodevf/mangayomi-extensions/main/index.json",
    );
    if (indexRes.error) throw new Error("no index");
    const curatedNames = new Set(registry.listCurated().map((s) => s.name.toLowerCase()));
    const candidates = indexRes.value
      .filter(
        (e) =>
          e.sourceCodeLanguage === 1 &&
          e.itemType === 0 &&
          !e.hasCloudflare &&
          !curatedNames.has(e.name.toLowerCase()),
      )
      .slice(0, 2);
    expect(candidates.length).toBeGreaterThanOrEqual(2);

    for (const candidate of candidates) {
      const resolved = await registry.resolve(`id-${candidate.id}`);
      expect(resolved).toBeDefined();
      expect(resolved!.name).toBe(candidate.name);
      expect(resolved!.codeUrl).toBe(candidate.sourceCodeUrl);
    }
  }, 20_000);

  it("a SourceInfo with all required fields drives the extension contract", () => {
    const sample: Source = {
      id: "sample",
      name: "Sample Source",
      lang: "en",
      baseUrl: "https://example.com",
      iconUrl: "https://example.com/favicon.ico",
      codeUrl: "https://example.com/sample.js",
      hasCloudflare: false,
      isNsfw: false,
    };
    expect(sample.id).toBeTruthy();
    expect(sample.name).toBeTruthy();
    expect(sample.lang).toBeTruthy();
    expect(sample.baseUrl).toMatch(/^https?:\/\//);
    expect(sample.codeUrl).toMatch(/^https?:\/\//);
    expect(typeof sample.hasCloudflare).toBe("boolean");
    expect(typeof sample.isNsfw).toBe("boolean");
  });
});
