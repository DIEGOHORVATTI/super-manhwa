# Native TypeScript connectors

Mangayomi extensions are sandboxed JS run via QuickJS (see `../runtime/`).
That works for everything the Mangayomi ecosystem already covers, but the
ecosystem **never carried the major Brazilian sites** — Tsuki Mangás, Union
Mangás, Brasil Mangás, Mangás Yabu, Goldenmangas, MangaLivre — and writing
those as Mangayomi-format JS would mean re-running them in QuickJS, with no
type safety, just to call our own code from inside a sandbox.

Native connectors skip the sandbox: they live as plain TypeScript modules
that implement `MangaConnector` directly. The backend can't tell the
difference between a native and a JS-backed connector — both produce
`RawListPage` / `RawDetail` / `RawPage[]` over the same interface.

## Contract

```ts
import type { MangaConnector } from "@packages/extension/types";

export const myConnector: MangaConnector = {
  // Metadata — matches `ConnectorMeta`
  id: "my-source",
  name: "My Source",
  lang: "pt-br",
  baseUrl: "https://example.com",
  iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=example.com",
  hasCloudflare: false,
  isNsfw: false,
  featured: true,

  // The four data methods — same shapes Mangayomi extensions return
  async getPopular(page: number) {
    /* return { list, hasNextPage } */
  },
  async search(query: string, page: number) {
    /* return { list, hasNextPage } */
  },
  async getDetail(link: string) {
    /* return RawDetail */
  },
  async getPageList(chapterUrl: string) {
    /* return Array<string | { url }> */
  },
};
```

Then add it to `CONNECTORS` in `../connectors/index.ts`.

## Conventions

- **`link` and `url` are opaque to the backend.** They can be anything — full
  URLs, slugs, ids, JSON-encoded objects — as long as your connector knows
  how to interpret them later. The backend stores them in the id-store and
  hands them back when calling `getDetail` / `getPageList`.
- **Errors propagate.** Throw on parse failures; the aggregator's fallback
  catches and tries other sources.
- **Timeouts are the caller's job.** The backend wraps each call with its
  own timeout, so you don't need to add one — just let `fetch()` propagate.
- **Status mapping**: return Mangayomi's numeric `status` (0=ongoing,
  1=completed, 2=hiatus, 3=cancelled, 4=publishing-finished). The backend's
  `MangaMapper` translates to its domain enum.

## Known-hostile Brazilian sites

Each of these blocks ordinary `fetch()` and needs either FlareSolverr or a
headless browser. Add them only after the bypass is wired:

| Site | Defence | Mitigation |
|---|---|---|
| Tsuki Mangás | Sucuri WebSocket JS challenge (`Loading…` HTML) | FlareSolverr |
| MangaLivre | JS-rendered SPA; "API" endpoints redirect to HTML | Puppeteer or scrape SSR HTML |
| Brasil Mangás | DNS failures from datacenter IPs | Residential proxy |
| Mangás Yabu | Server-side ad injection + bot challenge | Custom UA + cookie warm-up |

The cleanest BR launch will likely lean on a smaller, less-protected source
first (e.g. a scanlator group's direct site) plus MangaDex pt-br for breadth.
