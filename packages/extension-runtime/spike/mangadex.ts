/**
 * SPIKE — proves the runtime end-to-end against a real source. Fetches the
 * UNMODIFIED MangaDex extension from the Mangayomi repo and runs getPopular(1)
 * + getDetail in the QuickJS sandbox. Run: bun run spike:mangadex
 */
import { runExtension } from "../src/sandbox";
import type { MangaDetail, MangasPage } from "@packages/core";

const CODE_URL =
  "https://raw.githubusercontent.com/kodjodevf/mangayomi-extensions/main/javascript/manga/src/all/mangadex.js";

async function main() {
  const code = await (await fetch(CODE_URL)).text();
  console.log("→ running getPopular(1) in QuickJS sandbox (lang=en)…\n");

  const t0 = Date.now();
  const page = await runExtension<MangasPage>({
    code,
    method: "getPopular",
    args: [1],
    source: { lang: "en" },
    onLog: (level, msg) => console.log(`  [ext:${level}] ${msg}`),
  });
  console.log(
    `✓ getPopular: ${page.list.length} entries in ${Date.now() - t0}ms (hasNextPage=${page.hasNextPage})\n`,
  );
  for (const m of page.list.slice(0, 8)) console.log(`  • ${m.name}`);
  if (page.list.length === 0) throw new Error("Empty list");

  const first = page.list[0];
  console.log(`\n→ getDetail("${first.link}") — multiple sequential fetches…`);
  const detail = await runExtension<MangaDetail>({
    code,
    method: "getDetail",
    args: [first.link],
    source: { lang: "en" },
  });
  console.log(
    `✓ getDetail: ${detail.chapters?.length ?? 0} chapters, ${detail.genre?.length ?? 0} genres`,
  );
  console.log("\n✅ SPIKE PASSED — Mangayomi JS extension ran unmodified on the TS runtime.");
}

main().catch((e) => {
  console.error("\n❌ SPIKE FAILED:\n", e);
  process.exit(1);
});
