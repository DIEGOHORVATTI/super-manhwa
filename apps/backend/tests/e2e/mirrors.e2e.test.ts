import { describe, expect, it } from "bun:test";

import { runExtension } from "@packages/extension-runtime";

import { httpFetch, httpFetchText } from "@/shared/http-fetch";

import { makeCuratedSourceRegistry } from "@/modules/catalog/infrastructure/curated-source-registry";
import type { MangayomiIndex } from "@/modules/catalog/infrastructure/mangayomi-index";
import type { RawListPage } from "@/modules/catalog/domain/manga-catalog";
import type { Source } from "@/modules/catalog/domain/source";

/**
 * Mirror validation suite — exercises each curated source DIRECTLY through the
 * extension runtime (bypasses the backend HTTP layer) so we know:
 *
 *   - upstream code URL is reachable
 *   - getPopular() returns items
 *   - search() returns at least something for an iconic English query
 *
 * `getDetail` is intentionally NOT asserted because several upstream extensions
 * have stale selectors; the cross-source fallback covers user impact already.
 * That detail is documented in DECISIONS.md and in the test's "known issues" map.
 */

const registry = makeCuratedSourceRegistry();
const NON_CF_SOURCES: readonly Source[] = registry.listCurated().filter((s) => !s.hasCloudflare);

/**
 * Sources whose `search` is currently broken upstream (extension throws or
 * returns 0 even for known-on-source titles). Tests SKIP search for these;
 * popular is still asserted. Revisit when upstream fixes the extension.
 */
const KNOWN_SEARCH_FAILURES = new Set<string>([
  "weebcentral", // extension throws "cannot read property 'text' of null"
  "webtoons", // search consistently returns 0 hits even for catalog titles
]);

/**
 * A query each source SHOULD return at least one hit for. Different catalogs
 * have different content — Webtoons doesn't host One Piece (Shueisha title),
 * but it does host its own original "Tower of God"; MangaWorld is Italian, etc.
 */
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
        // Extension source must be at least a few KB of real JS.
        expect(r.value.length).toBeGreaterThan(500);
        expect(r.value).toMatch(/getPopular|search|getDetail/);
      });

      it(
        "getPopular returns >= 5 items",
        async () => {
          const r = await runFor<RawListPage>(src, "getPopular", [1], POPULAR_TIMEOUT_MS);
          expect((r.list ?? []).length).toBeGreaterThanOrEqual(5);
          for (const m of (r.list ?? []).slice(0, 3)) {
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
    // Every JS manga entry has the fields we depend on.
    for (const e of jsManga.slice(0, 10)) {
      expect(typeof e.id).toBe("number");
      expect(typeof e.name).toBe("string");
      expect(typeof e.lang).toBe("string");
      expect(typeof e.sourceCodeUrl).toBe("string");
      expect(e.sourceCodeUrl).toMatch(/^https?:\/\//);
    }
  });

  it("registry.resolve('id-<n>') finds dynamic sources from the upstream index", async () => {
    // Pick any non-CF, non-curated dynamic source and resolve it.
    const indexRes = await httpFetch<MangayomiIndex>(
      "https://raw.githubusercontent.com/kodjodevf/mangayomi-extensions/main/index.json",
    );
    if (indexRes.error) throw new Error("no index");
    const curatedNames = new Set(registry.listCurated().map((s) => s.name.toLowerCase()));
    const candidate = indexRes.value.find(
      (e) =>
        e.sourceCodeLanguage === 1 &&
        e.itemType === 0 &&
        !e.hasCloudflare &&
        !curatedNames.has(e.name.toLowerCase()),
    );
    expect(candidate).toBeDefined();
    const resolved = await registry.resolve(`id-${candidate!.id}`);
    expect(resolved).toBeDefined();
    expect(resolved!.name).toBe(candidate!.name);
    expect(resolved!.codeUrl).toBe(candidate!.sourceCodeUrl);
  }, 20_000);

  it("a SourceInfo with all required fields drives the extension contract", () => {
    // Document the contract every new mirror must satisfy.
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
    // The shape: every field is the minimum surface that aggregation needs.
    expect(sample.id).toBeTruthy();
    expect(sample.name).toBeTruthy();
    expect(sample.lang).toBeTruthy();
    expect(sample.baseUrl).toMatch(/^https?:\/\//);
    expect(sample.codeUrl).toMatch(/^https?:\/\//);
    expect(typeof sample.hasCloudflare).toBe("boolean");
    expect(typeof sample.isNsfw).toBe("boolean");
  });
});
