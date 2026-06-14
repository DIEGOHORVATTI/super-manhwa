import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { createPixPayment, mpEnabled } from "@/lib/payments/mercadopago";
import { donationCreateSchema } from "@packages/contracts";

/**
 * Start a Pix donation. Creates a Mercado Pago Pix payment and a pending
 * `donations` row, returning the QR code + copy-paste string. Works for
 * anonymous donors (userId null); a signed-in donor is attributed.
 */
export async function POST(req: Request) {
  if (!dbEnabled || !mpEnabled) {
    return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  }
  const parsed = donationCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const session = await getServerSession();
  const userId = session?.user?.id ?? null;
  const email = parsed.data.email ?? session?.user?.email ?? "doador@supermanhwa.app";

  const origin = new URL(req.url).origin;
  const pix = await createPixPayment({
    amount: parsed.data.amountCents / 100,
    description: "Doação — Super Manhwa",
    email,
    notificationUrl: `${origin}/api/donations/webhook`,
  });

  const db = getDb();
  const { donations } = schema;
  const [row] = await db
    .insert(donations)
    .values({
      userId,
      amountCents: parsed.data.amountCents,
      provider: "mercadopago",
      providerPaymentId: pix.providerPaymentId,
      status: pix.status,
      pixQr: pix.qrCode,
      pixQrBase64: pix.qrCodeBase64,
      message: parsed.data.message ?? null,
    })
    .returning({ id: donations.id });

  return NextResponse.json({
    id: row.id,
    status: pix.status,
    qrCode: pix.qrCode,
    qrCodeBase64: pix.qrCodeBase64,
  });
}
