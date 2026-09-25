import "server-only";

import { env } from "@/lib/env";

export const SITE_URL = "https://centralnovel.com";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9",
};
const BLOCKED = new Set([403, 429, 503]);
const TIMEOUT_MS = 20_000;

type RequestOptions = {
  revalidate?: number;
  method?: "GET" | "POST";
  body?: URLSearchParams;
};

async function viaFlareSolverr(url: string): Promise<string> {
  const response = await fetch(`${env.FLARESOLVERR_URL}/v1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cmd: "request.get", url, maxTimeout: 60_000 }),
    cache: "no-store",
  });
  const payload = (await response.json()) as { solution?: { status: number; response: string } };
  if (!payload.solution || payload.solution.status >= 400) {
    throw new Error(`Central Novel bloqueou a requisição (${url})`);
  }
  return payload.solution.response.replace(/^[\s\S]*?<pre[^>]*>([\s\S]*)<\/pre>[\s\S]*$/, "$1");
}

async function request(url: string, { revalidate = 3600, method = "GET", body }: RequestOptions) {
  const response = await fetch(url, {
    method,
    body,
    headers: HEADERS,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    ...(method === "GET" ? { next: { revalidate } } : { cache: "no-store" }),
  });
  return response;
}

export async function fetchText(url: string, options: RequestOptions = {}): Promise<string> {
  const response = await request(url, options);
  if (response.ok) return response.text();
  if (BLOCKED.has(response.status) && env.FLARESOLVERR_URL && options.method !== "POST") {
    return viaFlareSolverr(url);
  }
  throw new Error(`Central Novel respondeu ${response.status} (${url})`);
}

export async function fetchJson<T>(
  path: string,
  params: Record<string, string | number>,
  options: RequestOptions = {},
): Promise<{ data: T; totalPages: number }> {
  const url = new URL(`${SITE_URL}/wp-json${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));

  const response = await request(url.toString(), options);
  if (response.ok) {
    return {
      data: (await response.json()) as T,
      totalPages: Number(response.headers.get("X-WP-TotalPages") ?? 1),
    };
  }
  if (BLOCKED.has(response.status) && env.FLARESOLVERR_URL) {
    return { data: JSON.parse(await viaFlareSolverr(url.toString())) as T, totalPages: 1 };
  }
  throw new Error(`Central Novel respondeu ${response.status} (${url.pathname})`);
}

export async function fetchHead(url: string, until: string, maxBytes = 400_000): Promise<string> {
  const response = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok || !response.body) {
    if (BLOCKED.has(response.status) && env.FLARESOLVERR_URL) return viaFlareSolverr(url);
    throw new Error(`Central Novel respondeu ${response.status} (${url})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let html = "";
  while (html.length < maxBytes && !html.includes(until)) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
  }
  await reader.cancel();
  return html;
}
