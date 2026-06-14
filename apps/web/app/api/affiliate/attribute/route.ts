import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { normalizeCode, REF_COOKIE } from "@/lib/affiliate";
import { dbEnabled, getDb, schema } from "@/lib/db";

/**
 * Turns the first-touch `ref` cookie into a referral, called right after signup.
 * Idempotent (referredUserId is unique); no self-referral; clears the cookie.
 */
export async function POST() {
  if (!dbEnabled) return NextResponse.json({ ok: false });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const jar = await cookies();
  const code = normalizeCode(jar.get(REF_COOKIE)?.value);
  if (!code) return NextResponse.json({ ok: false });

  const db = getDb();
  const { affiliates, referrals } = schema;
  const [aff] = await db
    .select({ id: affiliates.id, userId: affiliates.userId })
    .from(affiliates)
    .where(eq(affiliates.code, code))
    .limit(1);

  // Valid affiliate, not self-referral.
  if (aff && aff.userId !== session.user.id) {
    await db
      .insert(referrals)
      .values({ affiliateId: aff.id, referredUserId: session.user.id })
      .onConflictDoNothing();
  }

  jar.delete(REF_COOKIE);
  return NextResponse.json({ ok: true });
}
