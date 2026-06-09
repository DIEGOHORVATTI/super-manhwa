import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";

/** Unlink one AniList account from the signed-in user. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ accountId: string }> }) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { accountId } = await ctx.params;
  const db = getDb();
  const { account } = schema;
  await db
    .delete(account)
    .where(
      and(
        eq(account.userId, session.user.id),
        eq(account.providerId, "anilist"),
        eq(account.accountId, accountId),
      ),
    );
  return NextResponse.json({ ok: true });
}
