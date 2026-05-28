# Mangayomi extensions — sync cadence

This package vendors a small subset of Mangayomi-format manga extension JS
files. The vendoring exists because the upstream ecosystem has multiple
unsynchronised forks with unresolved bugs, and our pt-br-first launch can't
wait on third-party PRs.

## Sources of truth, in priority order

| Repo | Why we watch it | URL |
|---|---|---|
| `m2k3a/mangayomi-extensions` | **Primary upstream.** Most active maintainer. We vendor from here. | https://github.com/m2k3a/mangayomi-extensions |
| `entityJY/mangayomi-extensions-eJ` | Downstream of m2k3a; sometimes adds sources first. Backs the `kodjodevf.github.io/mangayomi-extensions/index.json` we still use for the **dynamic** (non-curated) catalog. | https://github.com/entityJY/mangayomi-extensions-eJ |
| `Swakshan/mangayomi-swak-extensions` | Only 5 sources — niche, mostly novels. Watch for new BR-related additions only. | https://github.com/Swakshan/mangayomi-swak-extensions |
| ~~`kodjodevf/mangayomi-extensions`~~ | **Archived.** Don't pull from here. | https://github.com/kodjodevf/mangayomi-extensions |

## Weekly review (every Monday)

Spend ~15 min once a week sweeping the three active repos. The goal isn't to
re-sync everything mechanically — it's to **decide what's worth pulling**.

1. **Check commits since last sync** in m2k3a and entityJY:
   ```bash
   gh api 'repos/m2k3a/mangayomi-extensions/commits?since=2026-MM-DDT00:00:00Z' \
     --jq '.[] | "\(.commit.author.date | split("T")[0]) — \(.commit.message | split("\n")[0])"'
   ```
   Look for: changes to any of our 6 vendored files, new pt-br/pt sources, fixes
   to known-broken extensions (Webtoons getDetail, Mangafire getDetail, Comick).

2. **Re-sync the 6 vendored files** if any of them changed upstream:
   ```bash
   bun -e "
   const BASE = 'https://raw.githubusercontent.com/m2k3a/mangayomi-extensions/main/javascript/manga/src';
   const DEST = 'packages/extensions/javascript/manga/src';
   const files = ['all/mangadex.js','all/webtoons.js','en/weebcentral.js','en/manhwaz.js','it/mangaworld.js','en/asurascans.js'];
   for (const f of files) {
     const r = await fetch(\`\${BASE}/\${f}\`);
     await Bun.write(\`\${DEST}/\${f}\`, await r.text());
     console.log(f);
   }"
   ```
   Then bump `VENDORED_VERSION` in `packages/extensions/src/index.ts` and run
   `bun run test` to make sure the e2e mirror suite still passes.

3. **Scan new sources** in m2k3a's index for anything pt-br or interesting:
   ```bash
   gh api -H "Accept: application/vnd.github.raw" \
     repos/m2k3a/mangayomi-extensions/contents/index.json \
     | jq '[.[] | select(.sourceCodeLanguage==1 and .itemType==0 and (.lang | startswith("pt")))]'
   ```
   Today this returns 4 sources (MangaDex × 2 lang variants + Mangafire × 2),
   the same we already evaluated. Anything new and pt-br merits a probe (see
   the probe pattern in `apps/backend/tests/e2e/mirrors.e2e.test.ts`).

4. **Review open issues** filtered by manga + recent activity:
   ```bash
   gh issue list -R m2k3a/mangayomi-extensions --state open --search 'sort:updated-desc'
   gh issue list -R entityJY/mangayomi-extensions-eJ --state open --search 'sort:updated-desc'
   ```
   Watch for:
   - "Source X broken" reports for any of our 6 sources
   - "Add source Y" requests where Y is a Brazilian site (Tsuki Mangás, Union
     Mangás, Brasil Mangás, Mangás Yabu, Goldenmangas, MangaLivre, etc.) —
     those are still missing from every fork and would be ours to write.
   - Selector / parsing regressions

5. **Run our e2e mirror suite** to catch regressions immediately:
   ```bash
   bun run test
   ```
   The `KNOWN_SEARCH_FAILURES` and `KNOWN_DETAIL_FAILURES` sets in
   `mirrors.e2e.test.ts` document our current expectations. If upstream fixes
   one, remove it from the set; if a previously-working source breaks, add it.

## Adding a brand-new vendored source

When a new fork ships something we want (typical case: a Brazilian site we
write ourselves):

1. Drop the JS file in `packages/extensions/javascript/manga/src/<lang>/<name>.js`.
2. Add an entry to `CURATED` in
   `apps/backend/src/modules/catalog/infrastructure/curated-source-registry.ts`,
   using `codeUrl: "internal:<lang>/<name>.js"`.
3. Optionally add an entry to `ICONIC_QUERY` in `mirrors.e2e.test.ts` so the
   per-source test passes.
4. Rebuild Docker (`docker compose build app && docker compose up -d app`).

## What is NOT vendored

- The dynamic catalog at `kodjodevf.github.io/mangayomi-extensions/index.json`
  is still used for sources outside `CURATED`. Opaque ids pointing at a
  dynamic source resolve transparently — see `SourceRegistry.resolve()`.
- Other Mangayomi categories (anime, novel) are out of scope. The novel index
  has 5 entries total and no pt-br; we'll revisit if/when we ship a novel
  reader.

## Goal: Brazilian first launch

Mangayomi has **never** carried connectors for the major Brazilian sites
(Tsuki Mangás, Union Mangás, etc.) — the 4 pt-br entries in m2k3a's index are
all multi-language scanlator aggregators (MangaDex variants + Mangafire). For
the BR launch we'll need to write our own connectors, which is *exactly* what
this package was built to host. The contract is identical to upstream
Mangayomi (`getPopular`, `search`, `getDetail`, `getPageList`); see one of the
vendored files for a worked example.
