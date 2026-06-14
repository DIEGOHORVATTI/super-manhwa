import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { voteSchema } from "@packages/contracts";

/**
 * Up/down vote a comment. value ∈ {-1,0,1}; 0 clears the vote. The comment's
 * denormalized `score` is recomputed from the votes table in the same request.
 */

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const commentId = Number((await ctx.params).id);
  if (!Number.isInteger(commentId)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = voteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = getDb();
  const { commentVotes, comments } = schema;
  const userId = session.user.id;
  const value = parsed.data.value;

  if (value === 0) {
    await db
      .delete(commentVotes)
      .where(and(eq(commentVotes.commentId, commentId), eq(commentVotes.userId, userId)));
  } else {
    await db
      .insert(commentVotes)
      .values({ commentId, userId, value })
      .onConflictDoUpdate({
        target: [commentVotes.commentId, commentVotes.userId],
        set: { value },
      });
  }

  const [{ score }] = await db
    .select({ score: sql<number>`coalesce(sum(${commentVotes.value}), 0)` })
    .from(commentVotes)
    .where(eq(commentVotes.commentId, commentId));

  await db
    .update(comments)
    .set({ score: Number(score) })
    .where(eq(comments.id, commentId));
  return NextResponse.json({ score: Number(score), value });
}
