import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession, hasRole } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { commentEditSchema } from "@/lib/schemas/community";

/** Edit / soft-delete a comment. Author may do either; staff/admin may delete. */

async function load(id: number) {
  const db = getDb();
  const { comments } = schema;
  const [row] = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
  return row ?? null;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const row = await load(id);
  if (!row || row.deletedAt) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (row.userId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = commentEditSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = getDb();
  const { comments } = schema;
  const [updated] = await db
    .update(comments)
    .set({ body: parsed.data.body, editedAt: new Date() })
    .where(eq(comments.id, id))
    .returning();
  return NextResponse.json({ comment: updated });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const row = await load(id);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isOwner = row.userId === session.user.id;
  const isMod = hasRole(session.user as { role?: string }, "staff");
  if (!isOwner && !isMod) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getDb();
  const { comments } = schema;
  await db
    .update(comments)
    .set({ deletedAt: new Date() })
    .where(and(eq(comments.id, id)))
    .execute();
  return NextResponse.json({ ok: true });
}
