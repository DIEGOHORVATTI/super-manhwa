import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { dbEnabled, getDb, schema } from "@/lib/db";
import { getSubscriptionStatus, mpEnabled } from "@/lib/payments/mercadopago";

/**
 * Mercado Pago preapproval webhook. On a subscription status change we re-fetch
 * the authoritative status from MP (a spoofed ping can't grant premium) and, when
 * authorized, flip the user to premium with a 31-day window (renews on each cycle).
 */
const PERIOD_MS = 31 * 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  if (!dbEnabled || !mpEnabled) return NextResponse.json({ ok: true });

  let subId: string | null = null;
  try {
    const body = (await req.json()) as { type?: string; data?: { id?: string | number } };
    if (body.type === "subscription_preapproval" || body.type === "preapproval") {
      subId = body.data?.id != null ? String(body.data.id) : null;
    }
  } catch {
    /* fall through to querystring */
  }
  if (!subId) {
    const url = new URL(req.url);
    subId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  }
  if (!subId) return NextResponse.json({ ok: true });

  const status = await getSubscriptionStatus(subId).catch(() => null);
  if (!status) return NextResponse.json({ ok: true });

  const db = getDb();
  const { subscriptions, user } = schema;
  const now = new Date();
  const periodEnd = new Date(now.getTime() + PERIOD_MS);

  const [sub] = await db
    .update(subscriptions)
    .set({ status, currentPeriodEnd: status === "authorized" ? periodEnd : null, updatedAt: now })
    .where(eq(subscriptions.providerSubId, subId))
    .returning({ userId: subscriptions.userId });

  if (sub) {
    if (status === "authorized") {
      await db
        .update(user)
        .set({ plan: "premium", premiumUntil: periodEnd, updatedAt: now })
        .where(eq(user.id, sub.userId));
    } else if (status === "cancelled" || status === "paused") {
      await db.update(user).set({ plan: "free", updatedAt: now }).where(eq(user.id, sub.userId));
    }
  }

  return NextResponse.json({ ok: true });
}
