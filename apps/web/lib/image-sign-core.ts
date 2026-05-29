import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Pure image-URL signing — no env, no `server-only`, so it's unit-testable and
 * shared by the secret-bound wrappers in {@link image-sign}. The cover branch
 * MUST stay byte-identical to the backend's `coverSig`
 * (apps/backend/src/shared/image-sign.ts) so the Next proxy can verify covers
 * the backend minted.
 *
 * Two tag families:
 *  - cover:  HMAC(`pub:<token>`)                  → permanent, session-less
 *  - page:   HMAC(`prv:<token>:<exp>:<sid>`)      → expiring, session-bound
 */
export const SIG_BYTES = 18;

const mac = (secret: string, msg: string): string =>
  createHmac("sha256", secret).update(msg).digest("base64url").slice(0, SIG_BYTES);

const safeEqual = (a: string, b: string): boolean => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
};

export const coverSig = (token: string, secret: string): string => mac(secret, `pub:${token}`);
export const pageSig = (token: string, exp: number, sid: string, secret: string): string =>
  mac(secret, `prv:${token}:${exp}:${sid}`);

export const verifyCover = (token: string, k: string | null, secret: string): boolean =>
  !!k && safeEqual(k, coverSig(token, secret));

export const verifyPage = (
  token: string,
  e: string | null,
  s: string | null,
  sid: string,
  nowS: number,
  secret: string,
): boolean => {
  if (!e || !s || !sid) return false;
  const exp = Number.parseInt(e, 10);
  if (!Number.isFinite(exp) || exp < nowS) return false;
  return safeEqual(s, pageSig(token, exp, sid, secret));
};

const tokenOf = (path: string): string =>
  path.startsWith("/api/img/") ? path.slice("/api/img/".length) : path;

export const signPagePath = (
  path: string,
  sid: string,
  nowS: number,
  ttlS: number,
  secret: string,
): string => {
  const token = tokenOf(path);
  const exp = nowS + ttlS;
  return `${path}?e=${exp}&s=${pageSig(token, exp, sid, secret)}`;
};
