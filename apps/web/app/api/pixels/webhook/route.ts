import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { dbEnabled, getDb, schema } from "@/lib/db";
import { getPaymentStatus, mpEnabled } from "@/lib/payments/mercadopago";
import { normalizeMpStatus } from "@/lib/payments/status";

/**
 * Mercado Pago payment webhook for pixel purchases. Re-fetches the authoritative
 * status; on approval the reserved block moves to "pending" (awaiting admin
 * moderation before it shows on the public board).
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
    /* querystring fallback */
  }
  if (!paymentId) {
    const url = new URL(req.url);
    paymentId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  }
  if (!paymentId) return NextResponse.json({ ok: true });

  const status = await getPaymentStatus(paymentId).catch(() => null);
  if (normalizeMpStatus(status) !== "approved") return NextResponse.json({ ok: true });

  const db = getDb();
  const { pixelBlocks } = schema;
  await db
    .update(pixelBlocks)
    .set({ status: "pending" })
    .where(and(eq(pixelBlocks.paymentId, paymentId), eq(pixelBlocks.status, "reserved")));

  return NextResponse.json({ ok: true });
}
