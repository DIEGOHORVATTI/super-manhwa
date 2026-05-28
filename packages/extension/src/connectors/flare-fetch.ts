/**
 * `fetch()` with optional FlareSolverr fallthrough for sites behind Cloudflare,
 * Sucuri or other JS-challenge WAFs. When `FLARESOLVERR_URL` is set in the
 * environment the call is proxied through the solver (which spawns a headless
 * Chromium, solves the challenge, returns the rendered HTML). When not set,
 * falls back to plain `fetch()` — useful for local dev without the sidecar.
 *
 * The shape mirrors the host-side fetch the QuickJS sandbox uses, so native
 * connectors and Mangayomi-backed ones share the same bypass infrastructure.
 */

const DEFAULT_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface FlareFetchOptions {
  /** Standard fetch headers, layered on top of FS-injected ones. */
  headers?: Record<string, string>;
  /** Solver timeout in ms (default 60s — JS challenges take a while). */
  maxTimeout?: number;
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
 * the rendered body as a string — for binary streams (image proxy) use plain
 * `fetch()` directly; this helper is for HTML/JSON the connectors parse.
 */
export const flareFetch = async (
  url: string,
  opts: FlareFetchOptions = {},
): Promise<FlareFetchResult> => {
  const solver = process.env.FLARESOLVERR_URL;
  const headers = { "User-Agent": DEFAULT_UA, ...opts.headers };

  if (!solver) {
    const res = await fetch(url, { headers });
    return {
      status: res.status,
      url: res.url,
      body: await res.text(),
      headers: Object.fromEntries(res.headers),
      viaSolver: false,
    };
  }

  const fs = await fetch(solver, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cmd: "request.get",
      url,
      maxTimeout: opts.maxTimeout ?? 60_000,
    }),
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
