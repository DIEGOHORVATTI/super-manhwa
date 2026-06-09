import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { dbEnabled, getDb, schema } from "@/lib/db";
import { getPaymentStatus, mpEnabled } from "@/lib/payments/mercadopago";
import { normalizeMpStatus } from "@/lib/payments/status";

/**
 * Mercado Pago payment webhook. MP pings here on status changes ("payment"
 * topic) with the payment id; we re-fetch the authoritative status from MP (so a
 * spoofed ping can't approve a donation) and update the matching donation row.
 */
export async function POST(req: Request) {
  if (!dbEnabled || !mpEnabled) return NextResponse.json({ ok: true });

  let paymentId: string | null = null;
  try {
    const body = (await req.json()) as {
      type?: string;
      action?: string;
      data?: { id?: string | number };
    };
    if (body.type === "payment" || body.action?.startsWith("payment")) {
      paymentId = body.data?.id != null ? String(body.data.id) : null;
    }
  } catch {
    // MP also sends id as a querystring param on some integrations.
  }
  if (!paymentId) {
    paymentId = new URL(req.url).searchParams.get("data.id") ?? new URL(req.url).searchParams.get("id");
  }
  if (!paymentId) return NextResponse.json({ ok: true });

  const status = await getPaymentStatus(paymentId).catch(() => null);
  if (!status) return NextResponse.json({ ok: true });

  const normalized = normalizeMpStatus(status);

  const db = getDb();
  const { donations } = schema;
  await db
    .update(donations)
    .set({ status: normalized, updatedAt: new Date() })
    .where(eq(donations.providerPaymentId, paymentId));

  return NextResponse.json({ ok: true });
}
