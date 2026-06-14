import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { profileSchema } from "@packages/contracts";

/**
 * Update the signed-in user's profile. Handle is the public slug for /u/[handle]
 * — lowercase letters, digits and underscores, enforced unique here (Better Auth
 * doesn't dedupe additional fields).
 */
export async function PATCH(req: Request) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = profileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "bad_request" },
      { status: 400 },
    );
  }

  const db = getDb();
  const { user } = schema;

  if (parsed.data.handle) {
    const taken = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.handle, parsed.data.handle), ne(user.id, session.user.id)))
      .limit(1);
    if (taken.length) {
      return NextResponse.json({ error: "Esse @ já está em uso." }, { status: 409 });
    }
  }

  const [updated] = await db
    .update(user)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(user.id, session.user.id))
    .returning({ name: user.name, handle: user.handle, bio: user.bio });
  return NextResponse.json({ profile: updated });
}
