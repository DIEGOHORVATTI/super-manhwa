/**
 * Multi-source spike — runs getPopular(1) across several unmodified Mangayomi
 * extensions to prove the runtime works for BOTH JSON-API and HTML-scraping
 * sources (the latter exercise the cheerio-backed Document/Element bridge).
 *
 * Run:  bun run spike:sources
 */

import type { MangasPage } from "@packages/core";
import { runExtension } from "../src/sandbox";

const RAW =
  "https://raw.githubusercontent.com/kodjodevf/mangayomi-extensions/main/javascript/manga/src/";

interface Candidate {
  name: string;
  file: string;
  kind: "API" | "HTML";
  source?: Record<string, unknown>; // lang override for multi-lang sources
}

const CANDIDATES: Candidate[] = [
  { name: "MangaDex", file: "all/mangadex.js", kind: "API", source: { lang: "en" } },
  { name: "Comick", file: "all/comick.js", kind: "API", source: { lang: "en" } },
  { name: "Webtoons", file: "all/webtoons.js", kind: "HTML", source: { lang: "en" } },
  { name: "Weeb Central", file: "en/weebcentral.js", kind: "HTML" },
  { name: "Mangapill", file: "en/mangapill.js", kind: "HTML" },
  { name: "AsuraScans", file: "en/asurascans.js", kind: "HTML" },
  { name: "MangaWorld", file: "it/mangaworld.js", kind: "HTML" },
  { name: "Manhwaz", file: "en/manhwaz.js", kind: "HTML" },
];

async function tryOne(c: Candidate) {
  const code = await (await fetch(RAW + c.file)).text();
  const t0 = Date.now();
  const page = await runExtension<MangasPage>({
    code,
    method: "getPopular",
    args: [1],
    source: c.source,
    timeoutMs: 25_000,
  });
  const ms = Date.now() - t0;
  const n = page.list?.length ?? 0;
  if (n === 0) throw new Error("returned 0 entries");
  return { ms, n, sample: page.list[0]?.name ?? "?" };
}

async function main() {
  console.log(`Testing ${CANDIDATES.length} sources (getPopular, page 1)…\n`);
  let passed = 0;
  const results: string[] = [];
  for (const c of CANDIDATES) {
    process.stdout.write(`  ${c.kind.padEnd(4)} ${c.name.padEnd(14)} … `);
    try {
      const r = await tryOne(c);
      passed++;
      console.log(`✓ ${String(r.n).padStart(2)} items (${r.ms}ms)  e.g. "${r.sample}"`);
      results.push(`✓ ${c.name}`);
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e)
        .split("\n")[0]
        .slice(0, 90);
      console.log(`✗ ${msg}`);
      results.push(`✗ ${c.name}: ${msg}`);
    }
  }
  console.log(`\n${passed}/${CANDIDATES.length} sources working.`);
  if (passed >= 5) {
    console.log(`✅ GOAL MET — at least 5 plugins run on the TS runtime (API + HTML scraping).`);
  } else {
    console.log(`⚠️  Fewer than 5 passed — see failures above.`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("\n❌ spike crashed:\n", e);
  process.exit(1);
});
