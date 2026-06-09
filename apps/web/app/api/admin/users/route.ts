import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";

async function guard() {
  const me = await getCurrentUser();
  return hasRole(me as { role?: string } | null, "staff") ? me : null;
}

export async function GET() {
  if (!dbEnabled) return NextResponse.json({ users: [] });
  if (!(await guard())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getDb();
  const { user } = schema;
  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      handle: user.handle,
      role: user.role,
      banned: user.banned,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(200);
  return NextResponse.json({ users });
}

const PatchSchema = z.object({
  userId: z.string(),
  role: z.enum(["user", "staff", "admin"]).optional(),
  banned: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const me = await guard();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  // Only full admins can change roles; staff can ban/unban.
  const isAdmin =
    hasRole(me as { role?: string }, "staff") && (me as { role?: string }).role === "admin";

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (parsed.data.role !== undefined && !isAdmin) {
    return NextResponse.json({ error: "Apenas admin altera papéis." }, { status: 403 });
  }

  const set: { role?: string; banned?: boolean; updatedAt: Date } = { updatedAt: new Date() };
  if (parsed.data.role !== undefined) set.role = parsed.data.role;
  if (parsed.data.banned !== undefined) set.banned = parsed.data.banned;

  const db = getDb();
  const { user } = schema;
  const [updated] = await db
    .update(user)
    .set(set)
    .where(eq(user.id, parsed.data.userId))
    .returning({ id: user.id, role: user.role, banned: user.banned });
  return NextResponse.json({ user: updated });
}
