import "server-only";
import { randomUUID } from "node:crypto";
import { render } from "@react-email/render";

import { ConfirmNewsletterEmail } from "@packages/emails";
import { dbEnabled } from "@/lib/db";
import { emailEnabled, sendEmail } from "@/lib/email";
import { subscribersRepo } from "@/lib/repositories/subscribers";

/**
 * Newsletter application service (double opt-in). All persistence goes through
 * {@link subscribersRepo}; input is Zod-validated at the route; e-mails are
 * React Email templates rendered to HTML. No-ops gracefully when the DB /
 * e-mail aren't configured.
 */
export const newsletterEnabled = () => dbEnabled && emailEnabled;

/** Create/refresh a pending subscriber and send the confirmation e-mail. */
export async function subscribeEmail(
  email: string,
  base: string,
): Promise<"sent" | "already" | "error"> {
  const normalized = email.trim().toLowerCase();
  const existing = await subscribersRepo.byEmail(normalized);
  if (existing?.status === "confirmed") return "already";

  const token = randomUUID();
  await subscribersRepo.upsertPending(normalized, token);

  try {
    const html = await render(
      ConfirmNewsletterEmail({ confirmUrl: `${base}/api/newsletter/confirm?token=${token}` }),
    );
    await sendEmail({ to: normalized, subject: "Confirme sua inscrição — Super Manhwa", html });
    return "sent";
  } catch {
    return "error";
  }
}

export async function confirmToken(token: string): Promise<boolean> {
  const row = await subscribersRepo.byToken(token);
  if (!row) return false;
  await subscribersRepo.setStatus(row.id, "confirmed");
  return true;
}

export async function unsubscribeToken(token: string): Promise<boolean> {
  const row = await subscribersRepo.byToken(token);
  if (!row) return false;
  await subscribersRepo.setStatus(row.id, "unsubscribed");
  return true;
}
