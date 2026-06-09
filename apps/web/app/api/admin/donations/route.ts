import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";

/** Recent donations for the admin panel (approved totals + history). */
export async function GET() {
  if (!dbEnabled) return NextResponse.json({ donations: [], totalApprovedCents: 0 });
  const me = await getCurrentUser();
  if (!hasRole(me as { role?: string } | null, "staff")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const db = getDb();
  const { donations } = schema;
  const rows = await db
    .select({
      id: donations.id,
      amountCents: donations.amountCents,
      status: donations.status,
      message: donations.message,
      createdAt: donations.createdAt,
    })
    .from(donations)
    .orderBy(desc(donations.createdAt))
    .limit(200);

  const totalApprovedCents = rows
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + r.amountCents, 0);
  return NextResponse.json({ donations: rows, totalApprovedCents });
}
