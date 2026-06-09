import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { createSubscription, mpEnabled } from "@/lib/payments/mercadopago";

/** Start a premium subscription (Mercado Pago preapproval). Returns the checkout URL. */
export const PREMIUM_PRICE_BRL = Number(process.env.LEARN_PREMIUM_PRICE ?? 14.9);

export async function POST(req: Request) {
  if (!dbEnabled || !mpEnabled)
    return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const origin = new URL(req.url).origin;
  const sub = await createSubscription({
    email: session.user.email,
    amount: PREMIUM_PRICE_BRL,
    reason: "Super Manhwa — Premium (aprendizado de idiomas)",
    backUrl: `${origin}/learn?upgraded=1`,
  });

  const db = getDb();
  const { subscriptions } = schema;
  await db.insert(subscriptions).values({
    userId: session.user.id,
    provider: "mercadopago",
    providerSubId: sub.id,
    status: sub.status,
  });

  return NextResponse.json({ initPoint: sub.initPoint, status: sub.status });
}
