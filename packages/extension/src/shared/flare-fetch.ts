/**
 * `fetch()` with optional FlareSolverr fallthrough for sites behind Cloudflare,
 * Sucuri or other JS-challenge WAFs. When `FLARESOLVERR_URL` is set in the
 * environment the call is proxied through the solver (which spawns a headless
 * Chromium, solves the challenge, returns the rendered HTML). When not set,
 * falls back to plain `fetch()` | useful for local dev without the sidecar.
 *
 * The shape mirrors the host-side fetch the QuickJS sandbox uses, so native
 * connectors and Mangayomi-backed ones share the same bypass infrastructure.
 */

const DEFAULT_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface FlareFetchOptions {
  /** Standard fetch headers, layered on top of FS-injected ones. */
  headers?: Record<string, string>;
  /** Solver timeout in ms (default 60s | JS challenges take a while). */
  maxTimeout?: number;
  /**
   * Force a plain `fetch()` even when `FLARESOLVERR_URL` is configured. For
   * endpoints that pass with a browser UA directly and would only be slowed
   * (and rate-limited) by a needless Chromium render | e.g. paginated JSON
   * APIs. The solver is reserved for the routes that actually trip a challenge.
   */
  direct?: boolean;
}

export interface FlareFetchResult {
  status: number;
  url: string;
  body: string;
  headers: Record<string, string>;
  /** True if the request actually went through FlareSolverr. */
  viaSolver: boolean;
}

/**
 * Fetch the target URL, routing through FlareSolverr when configured. Returns
 * the rendered body as a string | for binary streams (image proxy) use plain
 * `fetch()` directly; this helper is for HTML/JSON the connectors parse.
 */
export const flareFetch = async (
  url: string,
  opts: FlareFetchOptions = {},
): Promise<FlareFetchResult> => {
  const solver = opts.direct ? undefined : process.env.FLARESOLVERR_URL;
  const headers = { "User-Agent": DEFAULT_UA, ...opts.headers };
  const maxTimeout = opts.maxTimeout ?? 60_000;

  if (!solver) {
    // Hard client-side ceiling so a dead host can't hang the connector forever.
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
    return {
      status: res.status,
      url: res.url,
      body: await res.text(),
      headers: Object.fromEntries(res.headers),
      viaSolver: false,
    };
  }

  // The solver's `maxTimeout` only bounds the in-browser challenge solve; the
  // POST itself can still hang if the solver is saturated or wedged. Cap the
  // round-trip client-side (solve budget + margin) so a stuck solver surfaces
  // as a throw the connector/aggregator can fall back from | never a hang.
  const fs = await fetch(solver, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cmd: "request.get",
      url,
      maxTimeout,
    }),
    signal: AbortSignal.timeout(maxTimeout + 15_000),
  });
  if (!fs.ok) {
    throw new Error(`flaresolverr ${fs.status} for ${url}`);
  }
  const data = (await fs.json()) as {
    status: string;
    message?: string;
    solution?: {
      status: number;
      url: string;
      response: string;
      headers?: Record<string, string>;
    };
  };
  if (data.status !== "ok" || !data.solution) {
    throw new Error(`flaresolverr: ${data.message ?? "no solution"}`);
  }
  return {
    status: data.solution.status,
    url: data.solution.url,
    body: data.solution.response,
    headers: data.solution.headers ?? {},
    viaSolver: true,
  };
};

/**
 * FlareSolverr renders a real Chromium, so a JSON API endpoint comes back
 * wrapped in `<html>…<pre>{json}</pre>…</html>`. Strip back to the raw JSON
 * when that's the shape; otherwise return the body untouched (plain-fetch
 * returns raw JSON already, and real HTML pages pass through).
 */
const unwrapPreJson = (body: string): string => {
  const m = body.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (!m) return body;
  const inner = m[1]
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
  return inner.startsWith("{") || inner.startsWith("[") ? inner : body;
};

/**
 * Fetch a JSON API endpoint through the same WAF bypass and parse it. Handles
 * the FlareSolverr `<pre>`-wrapping transparently. Throws on non-2xx or parse
 * failure | connectors let it propagate to the aggregator's fallback.
 */
export const flareFetchJson = async <T>(url: string, opts: FlareFetchOptions = {}): Promise<T> => {
  const res = await flareFetch(url, {
    ...opts,
    headers: { Accept: "application/json", ...opts.headers },
  });
  if (res.status >= 400) throw new Error(`${url} → HTTP ${res.status}`);
  return JSON.parse(unwrapPreJson(res.body)) as T;
};
