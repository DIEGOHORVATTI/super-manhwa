/**
 * Host-side capabilities exposed to the sandbox (ADR-0004). The sandboxed
 * extension has no network of its own; these functions are the ONLY way out, so
 * egress is fully controlled here. In production the fetch layer also reads/writes
 * the cookie jar in KV (ADR-0006) and routes Cloudflare sources to an external
 * browser service (ADR-0005) — omitted in the MVP/spike.
 */

import { load, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import CryptoJS from "crypto-js";

/** Minimal CSS identifier escape for id/class lookups. */
function cssEscape(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

const DEFAULT_UA =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";

export interface HostRequest {
  method: string;
  url: string;
  headers?: Record<string, unknown>;
  body?: unknown;
}

export interface HostResponse {
  body: string;
  statusCode: number;
  headers: Record<string, string>;
  isRedirect: boolean;
  reasonPhrase: string;
  request: { method: string; url: string };
}

export interface FetchOpts {
  /** When true and a solver is configured, route through it (ADR-0005). */
  cloudflare?: boolean;
}

/** Perform the actual network request for the sandbox. */
export async function hostFetch(req: HostRequest, opts: FetchOpts = {}): Promise<HostResponse> {
  // Cloudflare-protected GETs go through an external browser solver if one is
  // configured (FlareSolverr/Browserless). Without it, CF sources fail (expected).
  const solverUrl = process.env.FLARESOLVERR_URL;
  if (opts.cloudflare && solverUrl && (req.method === "GET" || req.method === "HEAD")) {
    return solveWithFlareSolverr(solverUrl, req.url);
  }

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers ?? {})) {
    if (v === null || v === undefined) continue; // extensions often pass undefined UA
    headers[k] = String(v);
  }
  if (!Object.keys(headers).some((h) => h.toLowerCase() === "user-agent")) {
    headers["User-Agent"] = DEFAULT_UA;
  }

  let body: string | undefined;
  if (
    req.body !== null &&
    req.body !== undefined &&
    req.method !== "GET" &&
    req.method !== "HEAD"
  ) {
    if (typeof req.body === "string") {
      body = req.body;
    } else {
      body = JSON.stringify(req.body);
      if (!Object.keys(headers).some((h) => h.toLowerCase() === "content-type")) {
        headers["Content-Type"] = "application/json";
      }
    }
  }

  const res = await fetch(req.url, { method: req.method, headers, body });
  const text = await res.text();
  const outHeaders: Record<string, string> = {};
  res.headers.forEach((value, key) => (outHeaders[key] = value));

  return {
    body: text,
    statusCode: res.status,
    headers: outHeaders,
    isRedirect: res.redirected,
    reasonPhrase: res.statusText,
    request: { method: req.method, url: req.url },
  };
}

/**
 * Cloudflare bypass via an external FlareSolverr instance (ADR-0005). Set
 * FLARESOLVERR_URL (e.g. https://solver.example.com/v1) to enable. Returns the
 * solved HTML so the extension's selectors see real content, not the challenge.
 */
async function solveWithFlareSolverr(solverUrl: string, target: string): Promise<HostResponse> {
  const res = await fetch(solverUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cmd: "request.get", url: target, maxTimeout: 60000 }),
  });
  const data = (await res.json()) as {
    status?: string;
    message?: string;
    solution?: { status: number; response: string; userAgent?: string };
  };
  if (data.status !== "ok" || !data.solution) {
    throw new Error(`FlareSolverr failed: ${data.message ?? "unknown"}`);
  }
  return {
    body: data.solution.response,
    statusCode: data.solution.status,
    headers: {},
    isRedirect: false,
    reasonPhrase: "OK",
    request: { method: "GET", url: target },
  };
}

/** Preference lookup. MVP returns undefined so extensions fall back to defaults. */
export function hostPrefGet(_key: string): unknown {
  return undefined;
}

// ---- Crypto helpers (utils.dart) — CryptoJS-compatible ----

export function aesEncryptCryptoJS(plain: string, passphrase: string): string {
  return CryptoJS.AES.encrypt(plain, passphrase).toString();
}
export function aesDecryptCryptoJS(encrypted: string, passphrase: string): string {
  return CryptoJS.AES.decrypt(encrypted, passphrase).toString(CryptoJS.enc.Utf8);
}

/** Dean Edwards' p,a,c,k,e,d unpacker — decodes eval(function(p,a,c,k,e,d){...}). */
export function unpackJs(source: string): string {
  const m = source.match(/}\('(.*)',\s*(\d+),\s*(\d+),\s*'(.*?)'\.split\('\|'\)/s);
  if (!m) return source;
  const payload = m[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\");
  const radix = parseInt(m[2], 10);
  const words = m[4].split("|");
  const encode = (c: number): string => {
    const a = c < radix ? "" : encode(Math.floor(c / radix));
    const r = c % radix;
    return a + (r > 35 ? String.fromCharCode(r + 29) : r.toString(36));
  };
  const dict: Record<string, string> = {};
  for (let i = words.length - 1; i >= 0; i--) dict[encode(i)] = words[i] || encode(i);
  return payload.replace(/\b\w+\b/g, (w) => dict[w] ?? w);
}

/**
 * AES-CBC with explicit utf8 key/iv over HEX ciphertext (the copymanga pattern:
 * cryptoHandler(hexData, iv, key, false)).
 */
export function cryptoHandler(text: string, iv: string, key: string, encrypt: boolean): string {
  const k = CryptoJS.enc.Utf8.parse(key);
  const i = CryptoJS.enc.Utf8.parse(iv);
  const cfg = { iv: i, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 };
  if (encrypt) {
    return CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(text), k, cfg).ciphertext.toString(
      CryptoJS.enc.Hex,
    );
  }
  const params = CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Hex.parse(text) });
  return CryptoJS.AES.decrypt(params, k, cfg).toString(CryptoJS.enc.Utf8);
}

/**
 * Host-side HTML DOM backing the sandbox's `Document`/`Element` (dom_selector.dart
 * ≈ Jsoup → cheerio). The sandbox holds opaque numeric node ids; all parsing and
 * querying happens here. Scoped to one extension run — `dispose()` drops everything,
 * so no per-node GC is needed.
 */
export class DomStore {
  private nodes = new Map<number, { $: CheerioAPI; el: AnyNode }>();
  private seq = 1;

  parse(html: string): number {
    const $ = load(html);
    const id = this.seq++;
    this.nodes.set(id, { $, el: $.root()[0] as AnyNode });
    return id;
  }

  selectAll(id: number, selector: string): number[] {
    const n = this.nodes.get(id);
    if (!n) return [];
    const ids: number[] = [];
    n.$(n.el)
      .find(selector)
      .each((_, el) => {
        const nid = this.seq++;
        this.nodes.set(nid, { $: n.$, el });
        ids.push(nid);
      });
    return ids;
  }

  selectFirst(id: number, selector: string): number | null {
    const n = this.nodes.get(id);
    if (!n) return null;
    const el = n.$(n.el).find(selector).first();
    if (el.length === 0) return null;
    const nid = this.seq++;
    this.nodes.set(nid, { $: n.$, el: el[0] as AnyNode });
    return nid;
  }

  byId(id: number, elementId: string): number | null {
    return this.selectFirst(id, "#" + cssEscape(elementId));
  }
  byClass(id: number, className: string): number[] {
    return this.selectAll(id, "." + cssEscape(className));
  }
  byTag(id: number, tag: string): number[] {
    return this.selectAll(id, tag);
  }

  text(id: number): string {
    const n = this.nodes.get(id);
    return n ? n.$(n.el).text() : "";
  }
  attr(id: number, name: string): string {
    const n = this.nodes.get(id);
    return (n ? n.$(n.el).attr(name) : undefined) ?? "";
  }
  hasAttr(id: number, name: string): boolean {
    const n = this.nodes.get(id);
    return n ? n.$(n.el).attr(name) !== undefined : false;
  }
  html(id: number): string {
    const n = this.nodes.get(id);
    return (n ? n.$(n.el).html() : "") ?? "";
  }
  outerHtml(id: number): string {
    const n = this.nodes.get(id);
    if (!n) return "";
    try {
      return n.$.html(n.el);
    } catch {
      return "";
    }
  }
  dispose(): void {
    this.nodes.clear();
  }
}
