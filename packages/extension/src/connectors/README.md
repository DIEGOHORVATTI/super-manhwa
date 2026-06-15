# Native TypeScript connectors

Mangayomi extensions are sandboxed JS executed via QuickJS (see `../runtime/`).
That covers everything the Mangayomi ecosystem already maintains | but
**Mangayomi never carried the major Brazilian sites**, so for the BR launch
we author connectors as plain TypeScript modules that implement
`MangaConnector` directly.

The backend can't tell the difference between native and JS-backed
connectors | both produce `RawListPage` / `RawDetail` / `RawPage[]` over the
same interface, both go through the same registry, both flow into the same
aggregator.

## Current Brazilian inventory

All three are **registered as typed values** in `../connectors/index.ts` but
flagged `hasCloudflare: true`, which keeps them out of the popular
aggregation pool. They become live the day a real-browser bypass lands and
we flip the flag.

| Connector      | Site             | Status          | Blocker                                                                                                                                                                                                                           |
| -------------- | ---------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `tsuki-mangas` | tsuki-mangas.com | **WAF-blocked** | Sucuri JS challenge + post-challenge obfuscated bot trap. FlareSolverr passes the first wall, the second one (WebRTC + fingerprint check) needs a real browser.                                                                   |
| `manga-livre`  | mangalivre.net   | **SPA-only**    | No server-rendered content                                                                                                                                                                                                        | every URL returns the same 14kB shell. Needs Puppeteer/Playwright to execute the JS. |
| `mangas-yabu`  | mangayabu.top    | **Ad-redirect** | `<title>Redirecting…</title>` interstitials even through FlareSolverr; the cookie/UA fingerprint flow needs a full browser replay. The HTML parser is implemented (it's WordPress underneath); only the fetch layer is the issue. |

Other Brazilian sites investigated and ruled out:

- **Yes Mangás** | Sucuri JS challenge (same family as Tsuki).
- **Goldenmangas.top** | domain parked / for-sale page, no real content.
- **Argos Scan** | bare Cloudflare 403.
- **Brasil Mangás, HQNow, Lermangas, Mangahost, Mangaschan, Sussy Toons,
  Slime Read, Lermanga, Yugen** | DNS unreachable from datacenter networks.

The path forward is one of:

1. **Wire a headless-browser-backed `flareFetch` replacement.** FlareSolverr
   handles Cloudflare-style JS challenges but not the multi-stage
   fingerprint + cookie warm-up dance these sites use. Self-hosting
   Playwright + `playwright-stealth` is the minimum viable upgrade.
2. **Self-write a small scanlator-direct connector.** Smaller groups often
   serve plain WordPress without WAFs. The Yabu parser doubles as a
   template for any madara-themed WP install.
3. **Lean on MangaDex pt-br for the launch.** Already in `CONNECTORS`,
   already aggregated, already returning Portuguese titles.

## Contract

```ts
import type { MangaConnector } from '@packages/extension';

export const myConnector: MangaConnector = {
  id: 'my-source',
  name: 'My Source',
  lang: 'pt-br',
  baseUrl: 'https://example.com',
  iconUrl: 'https://www.google.com/s2/favicons?sz=64&domain=example.com',
  hasCloudflare: false,
  isNsfw: false,
  featured: true,

  async getPopular(page) {
    /* return { list, hasNextPage } */
  },
  async search(query, page) {
    /* return { list, hasNextPage } */
  },
  async getDetail(link) {
    /* return RawDetail */
  },
  async getPageList(chapterUrl) {
    /* return Array<string | { url }> */
  }
};
```

Then add it to `CONNECTORS` in `../connectors/index.ts`.

## Conventions

- **`link` and `url` are opaque to the backend.** They can be slugs,
  numeric ids, full URLs, JSON-encoded objects | as long as your connector
  knows how to interpret them when called with them back.
- **Errors propagate.** Throw on parse failures; the aggregator's
  cross-source fallback catches and tries other connectors.
- **Timeouts are the caller's job.** The backend wraps every call in its
  own timeout, so you don't need to add one in the connector | just let
  `fetch()` propagate.
- **Status mapping**: return Mangayomi's numeric `status` (0=ongoing,
  1=completed, 2=hiatus, 3=cancelled, 4=publishing-finished). The backend's
  `MangaMapper` translates to its domain enum.
- **For WAF-protected sources** use `flareFetch()` from `./flare-fetch.ts`
  | it transparently routes through `FLARESOLVERR_URL` when set and falls
  back to plain `fetch()` for local dev.
