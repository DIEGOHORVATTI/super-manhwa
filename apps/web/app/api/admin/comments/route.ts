import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";

/** Most recent comments across the site for moderation. */
export async function GET() {
  if (!dbEnabled) return NextResponse.json({ comments: [] });
  const me = await getCurrentUser();
  if (!hasRole(me as { role?: string } | null, "staff")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const db = getDb();
  const { comments, user } = schema;
  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      targetType: comments.targetType,
      targetId: comments.targetId,
      createdAt: comments.createdAt,
      deletedAt: comments.deletedAt,
      authorName: user.name,
      authorHandle: user.handle,
    })
    .from(comments)
    .leftJoin(user, eq(comments.userId, user.id))
    .orderBy(desc(comments.createdAt))
    .limit(100);
  return NextResponse.json({ comments: rows });
}
