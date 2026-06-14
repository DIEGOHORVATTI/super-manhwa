import { count, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerSession } from "@/lib/auth/session";
import { codeFromBytes } from "@/lib/affiliate";
import { dbEnabled, getDb, schema } from "@/lib/db";

/** Affiliate dashboard data: code/link, rate, pix key, referral count + totals. */
export async function GET() {
  if (!dbEnabled) return NextResponse.json({ affiliate: null });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getDb();
  const { affiliates, referrals, affiliateCommissions } = schema;
  const [aff] = await db
    .select({
      id: affiliates.id,
      code: affiliates.code,
      ratePct: affiliates.ratePct,
      pixKey: affiliates.pixKey,
    })
    .from(affiliates)
    .where(eq(affiliates.userId, session.user.id))
    .limit(1);
  if (!aff) return NextResponse.json({ affiliate: null });

  const [refs] = await db
    .select({ n: count() })
    .from(referrals)
    .where(eq(referrals.affiliateId, aff.id));
  const totals = await db
    .select({
      status: affiliateCommissions.status,
      cents: sql<number>`coalesce(sum(${affiliateCommissions.amountCents}), 0)`,
    })
    .from(affiliateCommissions)
    .where(eq(affiliateCommissions.affiliateId, aff.id))
    .groupBy(affiliateCommissions.status);
  const pending = Number(totals.find((t) => t.status === "pending")?.cents ?? 0);
  const paid = Number(totals.find((t) => t.status === "paid")?.cents ?? 0);

  return NextResponse.json({
    affiliate: { code: aff.code, ratePct: aff.ratePct, pixKey: aff.pixKey },
    stats: { referrals: refs.n, pendingCents: pending, paidCents: paid },
  });
}

const PostSchema = z.object({ pixKey: z.string().trim().max(140).optional() });

/** Join the program (creates a unique code) and/or set the payout Pix key. */
export async function POST(req: Request) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = PostSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = getDb();
  const { affiliates } = schema;
  const [existing] = await db
    .select({ id: affiliates.id })
    .from(affiliates)
    .where(eq(affiliates.userId, session.user.id))
    .limit(1);

  if (existing) {
    if (parsed.data.pixKey !== undefined) {
      await db
        .update(affiliates)
        .set({ pixKey: parsed.data.pixKey })
        .where(eq(affiliates.id, existing.id));
    }
    return NextResponse.json({ ok: true });
  }

  // New affiliate — generate a unique code (retry on the rare collision).
  let code = "";
  for (let i = 0; i < 5; i++) {
    code = codeFromBytes(crypto.getRandomValues(new Uint8Array(8)));
    const [clash] = await db
      .select({ id: affiliates.id })
      .from(affiliates)
      .where(eq(affiliates.code, code))
      .limit(1);
    if (!clash) break;
  }
  await db
    .insert(affiliates)
    .values({ userId: session.user.id, code, pixKey: parsed.data.pixKey ?? null });
  return NextResponse.json({ ok: true, code }, { status: 201 });
}
