import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { commentCreateSchema, targetTypeSchema as TargetType } from "@packages/contracts";

/**
 * Native comment thread API (replaces Disqus). A comment targets a work or a
 * chapter, keyed by the opaque catalog id used in routes. List is public; create
 * requires a signed-in user. Threads are one level deep (parentId).
 */

export async function GET(req: Request) {
  if (!dbEnabled) return NextResponse.json({ comments: [] });
  const url = new URL(req.url);
  const targetType = TargetType.safeParse(url.searchParams.get("targetType"));
  const targetId = url.searchParams.get("targetId");
  if (!targetType.success || !targetId) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const db = getDb();
  const { comments, user } = schema;
  const rows = await db
    .select({
      id: comments.id,
      parentId: comments.parentId,
      body: comments.body,
      score: comments.score,
      createdAt: comments.createdAt,
      editedAt: comments.editedAt,
      deletedAt: comments.deletedAt,
      userId: comments.userId,
      authorName: user.name,
      authorImage: user.image,
      authorHandle: user.handle,
      authorRole: user.role,
      authorPlan: user.plan,
    })
    .from(comments)
    .leftJoin(user, eq(comments.userId, user.id))
    .where(and(eq(comments.targetType, targetType.data), eq(comments.targetId, targetId)))
    .orderBy(desc(comments.createdAt))
    .limit(500);

  const session = await getServerSession();
  const meId = session?.user?.id ?? null;

  // Hide bodies of soft-deleted comments but keep them so replies don't orphan.
  const list = rows.map((r) => ({
    ...r,
    body: r.deletedAt ? null : r.body,
    mine: meId != null && r.userId === meId,
  }));
  return NextResponse.json({ comments: list, meId });
}

export async function POST(req: Request) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if ((session.user as { banned?: boolean }).banned) {
    return NextResponse.json({ error: "banned" }, { status: 403 });
  }

  const parsed = commentCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = getDb();
  const { comments } = schema;
  const [row] = await db
    .insert(comments)
    .values({
      userId: session.user.id,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      parentId: parsed.data.parentId ?? null,
      body: parsed.data.body,
    })
    .returning();
  return NextResponse.json({ comment: row }, { status: 201 });
}
