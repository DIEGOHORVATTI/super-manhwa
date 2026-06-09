import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { getWorkAccess } from "@/lib/perms";
import { teamAddSchema } from "@/lib/schemas/studio";

/** Add/update a team member by @handle (owner only). */

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const access = await getWorkAccess(id, session?.user?.id ?? null);
  if (!access.canManageTeam) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = teamAddSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = getDb();
  const { userWorks, teamMembers, user } = schema;
  const [work] = await db
    .select({ teamId: userWorks.teamId })
    .from(userWorks)
    .where(eq(userWorks.id, id))
    .limit(1);
  if (!work?.teamId) return NextResponse.json({ error: "no_team" }, { status: 400 });

  const [target] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.handle, parsed.data.handle))
    .limit(1);
  if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  await db
    .insert(teamMembers)
    .values({ teamId: work.teamId, userId: target.id, role: parsed.data.role })
    .onConflictDoUpdate({
      target: [teamMembers.teamId, teamMembers.userId],
      set: { role: parsed.data.role },
    });
  return NextResponse.json({ ok: true });
}

const RemoveSchema = z.object({ userId: z.string() });

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const access = await getWorkAccess(id, session?.user?.id ?? null);
  if (!access.canManageTeam) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = RemoveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = getDb();
  const { userWorks, teamMembers } = schema;
  const [work] = await db
    .select({ teamId: userWorks.teamId, ownerId: userWorks.ownerId })
    .from(userWorks)
    .where(eq(userWorks.id, id))
    .limit(1);
  if (!work?.teamId) return NextResponse.json({ error: "no_team" }, { status: 400 });
  if (work.ownerId === parsed.data.userId) {
    return NextResponse.json({ error: "Não é possível remover o dono." }, { status: 400 });
  }

  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, work.teamId), eq(teamMembers.userId, parsed.data.userId)));
  return NextResponse.json({ ok: true });
}
