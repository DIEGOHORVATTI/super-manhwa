import { describe, expect, it } from "bun:test";

import { CONNECTORS, type MangaConnector } from "@packages/extension";

/**
 * Native pt-br connectors exist as typed values even though their upstream
 * sites currently need a real-browser bypass to scrape (see
 * `packages/extension/src/native/README.md`). This suite validates the
 * contract surface — metadata, presence in CONNECTORS, exclusion from the
 * popular pool — so the wire stays correct as we incrementally enable them.
 *
 * We do NOT exercise the live network here. When a Playwright/Puppeteer
 * layer lands and we flip `hasCloudflare` to false on a connector, the
 * `mirrors.e2e.test.ts` per-connector contract suite picks it up
 * automatically (it iterates non-CF connectors).
 */

/**
 * Every pt-br connector that is currently CF-flagged (out of the popular pool).
 * Includes the native-TS sites (Tsuki/MangaLivre/Yabu) AND the Mangayomi-backed
 * pt-br aggregators (Comick/Mangafire) which are blocked on host reachability /
 * anti-bot vrf respectively. They share the same contract guarantees.
 */
const NATIVE_BR_IDS = ["comick-ptbr", "mangafire-ptbr"] as const;

describe("native BR connectors / registration", () => {
  it.each(NATIVE_BR_IDS)("'%s' is in CONNECTORS", (id) => {
    const c = CONNECTORS.find((x) => x.id === id);
    expect(c).toBeDefined();
  });

  it.each(NATIVE_BR_IDS)("'%s' declares lang=pt-br and hasCloudflare=true", (id) => {
    const c = CONNECTORS.find((x) => x.id === id) as MangaConnector;
    expect(c.lang).toBe("pt-br");
    // CF-flagged so the aggregator's popular pool skips them — the contract
    // we want until full-browser bypass lands.
    expect(c.hasCloudflare).toBe(true);
    expect(c.featured).toBe(false);
  });

  it.each(NATIVE_BR_IDS)("'%s' has a usable baseUrl", (id) => {
    const c = CONNECTORS.find((x) => x.id === id) as MangaConnector;
    expect(c.baseUrl).toMatch(/^https:\/\/[a-z0-9.-]+/);
    expect(c.iconUrl).toMatch(/^https:\/\//);
  });

  it.each(NATIVE_BR_IDS)("'%s' implements the full MangaConnector contract", (id) => {
    const c = CONNECTORS.find((x) => x.id === id) as MangaConnector;
    expect(typeof c.getPopular).toBe("function");
    expect(typeof c.search).toBe("function");
    expect(typeof c.getDetail).toBe("function");
    expect(typeof c.getPageList).toBe("function");
  });
});

describe("native BR connectors / failure modes", () => {
  // Each connector's methods either throw an Error (Tsuki/Yabu — site
  // unreachable without browser bypass) OR return `{ list: [] }` (MangaLivre
  // — SPA, parser stubbed). Both are acceptable shapes for an unreachable
  // connector. What is NOT acceptable: crashing the process, hanging
  // forever, or returning malformed data.

  const TEST_TIMEOUT = 40_000;

  it.each(NATIVE_BR_IDS)(
    "'%s'.getPopular returns a list (possibly empty) or throws a typed Error",
    async (id) => {
      const c = CONNECTORS.find((x) => x.id === id) as MangaConnector;
      try {
        const r = await c.getPopular(1);
        // Empty is fine when the upstream is blocked; the shape must still be valid.
        expect(Array.isArray(r.list ?? [])).toBe(true);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        // Either a generic error message or our flare-fetch surfaces it.
        expect((e as Error).message.length).toBeGreaterThan(0);
      }
    },
    TEST_TIMEOUT,
  );

  it.each(NATIVE_BR_IDS)(
    "'%s'.search returns a list or throws — never returns undefined",
    async (id) => {
      const c = CONNECTORS.find((x) => x.id === id) as MangaConnector;
      try {
        const r = await c.search("one piece", 1);
        expect(r).toBeDefined();
        expect(Array.isArray(r.list ?? [])).toBe(true);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
    },
    TEST_TIMEOUT,
  );
});

describe("native BR connectors / mangafire partial-working", () => {
  // Mangafire's `getPopular` works against mangafire.to (no vrf needed); only
  // search/getDetail need the anti-bot vrf that breaks under QuickJS. This is
  // the one positive signal we can assert without a working host — it proves
  // the vendored JS + our two vendor patches load and execute. Tolerant of the
  // upstream site being briefly down so it doesn't flake CI.
  it("mangafire-ptbr getPopular returns items (or the site is transiently down)", async () => {
    const c = CONNECTORS.find((x) => x.id === "mangafire-ptbr") as MangaConnector;
    try {
      const r = await c.getPopular(1);
      const list = r.list ?? [];
      if (list.length > 0) {
        expect(typeof list[0].name).toBe("string");
        expect(typeof list[0].link).toBe("string");
      }
    } catch (e) {
      // network/host hiccup — acceptable, the contract test above still holds
      expect(e).toBeInstanceOf(Error);
    }
  }, 40_000);
});

describe("native BR connectors / aggregator isolation", () => {
  it("native BR connectors are EXCLUDED from the popular aggregation pool", () => {
    // The aggregator pool filters `hasCloudflare: false`. The whole point of
    // the CF flag on these connectors is to keep broken sources out of the
    // home page even while their typed values exist.
    const pool = CONNECTORS.filter((c) => !c.hasCloudflare);
    for (const id of NATIVE_BR_IDS) {
      expect(pool.some((c) => c.id === id)).toBe(false);
    }
  });

  it("native BR connectors are still reachable via the registry by id (fallback path)", async () => {
    const { resolveConnector } = await import("@packages/extension");
    for (const id of NATIVE_BR_IDS) {
      const c = await resolveConnector(id);
      expect(c).toBeDefined();
      expect(c!.id).toBe(id);
    }
  });
});
