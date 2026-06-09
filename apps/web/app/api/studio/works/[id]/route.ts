import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { getWorkAccess } from "@/lib/perms";
import { workEditSchema } from "@/lib/schemas/studio";

/** Work detail (metadata + chapters + team) and edits, scoped by team role. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  const userId = session?.user?.id ?? null;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const access = await getWorkAccess(id, userId);
  if (!access.role) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getDb();
  const { userWorks, userChapters, teamMembers, user } = schema;
  const [work] = await db.select().from(userWorks).where(eq(userWorks.id, id)).limit(1);
  const chapters = await db
    .select({
      id: userChapters.id,
      number: userChapters.number,
      title: userChapters.title,
      status: userChapters.status,
      scheduledAt: userChapters.scheduledAt,
      publishedAt: userChapters.publishedAt,
    })
    .from(userChapters)
    .where(eq(userChapters.workId, id))
    .orderBy(asc(userChapters.number));

  const members = work.teamId
    ? await db
        .select({ userId: teamMembers.userId, role: teamMembers.role, name: user.name, handle: user.handle })
        .from(teamMembers)
        .leftJoin(user, eq(teamMembers.userId, user.id))
        .where(eq(teamMembers.teamId, work.teamId))
    : [];

  return NextResponse.json({ work, chapters, members, access });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const access = await getWorkAccess(id, session?.user?.id ?? null);
  if (!access.canEditWork) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = workEditSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = getDb();
  const { userWorks } = schema;
  const [updated] = await db.update(userWorks).set(parsed.data).where(eq(userWorks.id, id)).returning();
  return NextResponse.json({ work: updated });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const access = await getWorkAccess(id, session?.user?.id ?? null);
  if (!access.isOwner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getDb();
  const { userWorks } = schema;
  await db.delete(userWorks).where(eq(userWorks.id, id));
  return NextResponse.json({ ok: true });
}
