import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";

import { dbEnabled, getDb, schema } from "@/lib/db";

/** Monthly funding target in cents. Tune to the real running costs. */
const MONTHLY_TARGET_CENTS = 24_000; // R$240/mês

export type DonationGoal = {
  label: string;
  description: string;
  targetCents: number;
  raisedCents: number;
  pct: number;
};

/**
 * Monthly funding goal for the donation page | approved donations in the current
 * calendar month vs the target. Ko-fi-style "keep it free + ad-free" framing.
 */
export async function loadDonationGoal(): Promise<DonationGoal> {
  const label = "Mantenha o Super Manhwa gratuito e sem anúncios.";
  const description =
    "Sua contribuição ajuda a cobrir os custos dos servidores e do catálogo todo mês. " +
    "Ao apoiar, o Super Manhwa continua gratuito para todos — sem anúncios e sem conteúdo pago.";

  let raisedCents = 0;
  if (dbEnabled) {
    try {
      const db = getDb();
      const { donations } = schema;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const [row] = await db
        .select({ total: sql<number>`coalesce(sum(${donations.amountCents}), 0)` })
        .from(donations)
        .where(and(eq(donations.status, "approved"), gte(donations.createdAt, monthStart)));
      raisedCents = Number(row?.total ?? 0);
    } catch {
      /* keep 0 */
    }
  }

  const pct = Math.min(100, Math.round((raisedCents / MONTHLY_TARGET_CENTS) * 100));
  return { label, description, targetCents: MONTHLY_TARGET_CENTS, raisedCents, pct };
}
