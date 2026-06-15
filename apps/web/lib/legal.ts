import "server-only";
import { render } from "@react-email/render";
import { LegalRequestEmail } from "@packages/emails";

import { env } from "@/lib/env";
import { dbEnabled } from "@/lib/db";
import { emailEnabled, sendEmail } from "@/lib/email";
import { legalRequestsRepo } from "@/lib/repositories/legal-requests";

/**
 * Application service for the DMCA + contact forms: persist the (Zod-validated)
 * submission via the repository when a DB is configured, and notify the admin by
 * e-mail when Resend + ADMIN_EMAIL are configured. Returns `ok:false` only when
 * NEITHER is configured, so the UI can fall back to the plain mailto. Includes a
 * tiny per-instance rate limit (best-effort; the honeypot is checked at the route).
 */
type Payload = Record<string, unknown>;

// React Email escapes values automatically | só montamos os pares campo/valor.
const toFields = (payload: Payload): [string, string][] =>
  Object.entries(payload)
    .filter(([k]) => k !== "hp")
    .map(([k, v]) => [k, String(v ?? "")]);

export async function handleLegalSubmission(
  type: "dmca" | "contact",
  payload: Payload,
): Promise<{ ok: boolean; stored: boolean }> {
  let stored = false;
  if (dbEnabled) {
    await legalRequestsRepo.create(type, payload);
    stored = true;
  }
  const admin = env.ADMIN_EMAIL;
  if (emailEnabled && admin) {
    await sendEmail({
      to: admin,
      subject: `[${type}] nova solicitação | Super Manhwa`,
      html: await render(LegalRequestEmail({ type, fields: toFields(payload) })),
    });
  }
  return { ok: dbEnabled || (emailEnabled && Boolean(admin)), stored };
}

/* ----- tiny in-memory rate limit (per instance, best-effort) ----- */
const hits = new Map<string, { n: number; ts: number }>();
const WINDOW_MS = 60_000;
const MAX = 5;

export function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hit = hits.get(ip);
  if (!hit || now - hit.ts > WINDOW_MS) {
    hits.set(ip, { n: 1, ts: now });
    return false;
  }
  hit.n += 1;
  return hit.n > MAX;
}
