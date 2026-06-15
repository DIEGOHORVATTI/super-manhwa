import "server-only";
import { env } from "@/lib/env";

import * as core from "./image-sign-core";

/**
 * Secret-bound image signing for the RSC layer + `/api/img` proxy. The pure
 * algorithm lives in {@link image-sign-core} (unit-tested); this module only
 * pins the shared secret and the page-URL TTL so call sites stay terse. See the
 * core module for the two tag families (public cover vs session page).
 */
const SECRET = env.IMAGE_SIGN_SECRET ?? "dev-only-image-sign-secret-change-in-prod";

/** How long a signed page URL stays valid. The real guard is the `sid` binding
 *  (a copied link fails instantly in another browser); the expiry only bounds
 *  replay if the cookie itself is also stolen, so it can outlast a slow read. */
export const PAGE_URL_TTL_S = 2 * 60 * 60;

export const verifyCover = (token: string, k: string | null): boolean =>
  core.verifyCover(token, k, SECRET);

export const verifyPage = (
  token: string,
  e: string | null,
  s: string | null,
  sid: string,
  nowS: number,
): boolean => core.verifyPage(token, e, s, sid, nowS, SECRET);

/** Append `?e=&s=` to a bare `/api/img/<token>` page path for `sid`. */
export const signPagePath = (path: string, sid: string, nowS: number): string =>
  core.signPagePath(path, sid, nowS, PAGE_URL_TTL_S, SECRET);
