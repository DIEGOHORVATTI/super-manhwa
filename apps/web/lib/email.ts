import "server-only";
import { env } from "@/lib/env";
import { Resend } from "resend";

/**
 * Transactional e-mail via Resend. Gated on `RESEND_API_KEY` — `emailEnabled`
 * lets callers (legal forms, newsletter) skip sending when not configured.
 */
const key = env.RESEND_API_KEY;
const FROM = env.MAIL_FROM ?? "Super Manhwa <no-reply@supermanhwa.com>";

export const emailEnabled = Boolean(key);

const resend = key ? new Resend(key) : null;

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<void> {
  if (!resend) throw new Error("RESEND_API_KEY is not set");
  await resend.emails.send({ from: FROM, ...opts });
}
