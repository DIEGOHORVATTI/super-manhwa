import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";

async function guard() {
  const me = await getCurrentUser();
  return hasRole(me as { role?: string } | null, "staff") ? me : null;
}

/** Affiliates with their pending commission total + payout Pix key (for manual payouts). */
export async function GET() {
  if (!dbEnabled) return NextResponse.json({ affiliates: [] });
  if (!(await guard())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getDb();
  const { affiliates, affiliateCommissions, user } = schema;
  const rows = await db
    .select({
      id: affiliates.id,
      code: affiliates.code,
      pixKey: affiliates.pixKey,
      name: user.name,
      handle: user.handle,
      pendingCents: sql<number>`coalesce(sum(case when ${affiliateCommissions.status} = 'pending' then ${affiliateCommissions.amountCents} else 0 end), 0)`,
    })
    .from(affiliates)
    .leftJoin(user, eq(affiliates.userId, user.id))
    .leftJoin(affiliateCommissions, eq(affiliateCommissions.affiliateId, affiliates.id))
    .groupBy(affiliates.id, user.name, user.handle);

  return NextResponse.json({
    affiliates: rows.map((r) => ({ ...r, pendingCents: Number(r.pendingCents) })),
  });
}

const PaySchema = z.object({ affiliateId: z.number().int().positive() });

/** Mark an affiliate's pending commissions as paid (records a payout timestamp). */
export async function POST(req: Request) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  if (!(await guard())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = PaySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = getDb();
  const { affiliateCommissions } = schema;
  await db
    .update(affiliateCommissions)
    .set({ status: "paid", paidAt: new Date() })
    .where(
      and(
        eq(affiliateCommissions.affiliateId, parsed.data.affiliateId),
        eq(affiliateCommissions.status, "pending"),
      ),
    );
  return NextResponse.json({ ok: true });
}
