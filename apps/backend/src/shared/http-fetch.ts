import { type Result, wrapPromiseResult } from "./result";

/**
 * Typed `fetch` wrappers that always return a `Result<T, HttpError>` — no
 * exceptions thrown. Call sites get exhaustive failure handling without try/catch
 * scaffolding everywhere.
 *
 *   const r = await httpFetch<MangaDexResponse>(url);
 *   if (r.error) return [];
 *   return r.value.data;
 *
 * Three variants for three response shapes:
 *   - `httpFetch<T>`  → JSON-parsed `T` (the common case)
 *   - `httpFetchText` → raw `string` (e.g. downloading extension JS source)
 *   - `httpFetchRaw`  → raw `Response` (binary streams — image proxy)
 *
 * Every integration that the backend talks to must provide a real type for `T`;
 * if a third-party API doesn't have one yet, declare it next to the call site
 * and pass it as the generic. `unknown` is allowed only when explicitly chosen.
 */

export class HttpError extends Error {
  readonly status: number;
  readonly body: string;
  constructor(status: number, body: string, url: string) {
    super(`HTTP ${status} from ${url}`);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

const checkOk = async (res: Response): Promise<Response> => {
  if (res.ok) return res;
  // Drain the body for diagnostics; ignore errors (body might be empty/binary).
  const body = await res.text().catch(() => "");
  throw new HttpError(res.status, body, res.url);
};

/** Fetch + parse JSON. The generic enforces a real type at the call site. */
export const httpFetch = async <T>(
  url: string | URL,
  init?: RequestInit,
): Promise<Result<T, HttpError>> =>
  wrapPromiseResult<T, HttpError>(
    fetch(url, init)
      .then(checkOk)
      .then((res) => res.json() as Promise<T>),
  );

/** Fetch + return raw text (no JSON.parse). */
export const httpFetchText = async (
  url: string | URL,
  init?: RequestInit,
): Promise<Result<string, HttpError>> =>
  wrapPromiseResult<string, HttpError>(
    fetch(url, init)
      .then(checkOk)
      .then((res) => res.text()),
  );

/**
 * Fetch + return the raw `Response`. Use for binary streams (image proxy)
 * where the body is forwarded to another consumer rather than read into memory.
 *
 * Note: a non-2xx upstream is still surfaced as `HttpError` in the Err branch —
 * the caller doesn't have to inspect `.value.status` themselves.
 */
export const httpFetchRaw = async (
  url: string | URL,
  init?: RequestInit,
): Promise<Result<Response, HttpError>> =>
  wrapPromiseResult<Response, HttpError>(fetch(url, init).then(checkOk));
