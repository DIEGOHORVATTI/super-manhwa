/**
 * Affiliate helpers — pure, unit-testable. The recurring model: an affiliate earns
 * `ratePct`% (default 20) of each authorized monthly subscription of a user they
 * referred (first-touch). Attribution window: 30 days (the `ref` cookie's life).
 */
export const DEFAULT_RATE_PCT = 20;
export const REF_COOKIE = "ref";
export const REF_COOKIE_MAX_AGE_S = 30 * 24 * 60 * 60; // 30 days

/** Commission for a payment, in cents. */
export function commissionCents(amountCents: number, ratePct: number = DEFAULT_RATE_PCT): number {
  return Math.max(0, Math.round((amountCents * ratePct) / 100));
}

/** Affiliate codes are 6–12 lowercase alphanumerics. */
export function isValidCode(code: string): boolean {
  return /^[a-z0-9]{6,12}$/.test(code);
}

/** Normalize a referral code from a URL/cookie (lowercased, trimmed). */
export function normalizeCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const c = raw.trim().toLowerCase();
  return isValidCode(c) ? c : null;
}

/** Current billing period key (UTC month) — one commission row per period. */
export function periodKey(now: Date): string {
  return now.toISOString().slice(0, 7); // YYYY-MM
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Deterministic-length random code from supplied random bytes (testable). */
export function codeFromBytes(bytes: Uint8Array, len = 8): string {
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i % bytes.length] % ALPHABET.length];
  return out;
}
