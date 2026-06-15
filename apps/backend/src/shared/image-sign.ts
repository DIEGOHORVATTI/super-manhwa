import { createHmac } from "node:crypto";

import { env } from "@/config/env";

/**
 * Public-cover signature. Covers (AniList / connector thumbnails) are not
 * sensitive, so they get a *permanent, session-less* HMAC tag appended as `?k=`.
 * The Next image proxy verifies this tag and serves the cover with a long,
 * immutable, CDN-shareable cache | while *page* images (which carry no `k`) are
 * forced down the session-signed, `private` path instead.
 *
 * Keep the algorithm byte-for-byte in sync with the web app's verifier
 * (`apps/web/lib/image-sign.ts`): both HMAC `pub:<token>` with the shared
 * `IMAGE_SIGN_SECRET` and base64url the first 18 bytes.
 */
const SIG_BYTES = 18;

export const coverSig = (token: string, secret = env.IMAGE_SIGN_SECRET): string =>
  createHmac("sha256", secret).update(`pub:${token}`).digest("base64url").slice(0, SIG_BYTES);

/** Append the public-cover signature to a bare `/api/img/<token>` path. */
export const signCoverPath = (path: string): string => {
  const token = path.startsWith("/api/img/") ? path.slice("/api/img/".length) : path;
  return `${path}?k=${coverSig(token)}`;
};
