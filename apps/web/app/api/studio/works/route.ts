import { desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { slugifyWork, workCreateSchema } from "@packages/contracts";

/** List the works I own or collaborate on; create a new work (+ its team). */

export async function GET() {
  if (!dbEnabled) return NextResponse.json({ works: [] });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getDb();
  const { userWorks, teamMembers } = schema;
  const userId = session.user.id;

  const teamIds = (
    await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId))
  ).map((r) => r.teamId);

  const owned = await db
    .select({
      id: userWorks.id,
      title: userWorks.title,
      slug: userWorks.slug,
      status: userWorks.status,
    })
    .from(userWorks)
    .where(eq(userWorks.ownerId, userId))
    .orderBy(desc(userWorks.createdAt));

  const collab = teamIds.length
    ? await db
        .select({
          id: userWorks.id,
          title: userWorks.title,
          slug: userWorks.slug,
          status: userWorks.status,
        })
        .from(userWorks)
        .where(inArray(userWorks.teamId, teamIds))
    : [];

  // Dedupe (an owned work also has the owner in its team).
  const map = new Map<number, (typeof owned)[number]>();
  for (const w of [...owned, ...collab]) map.set(w.id, w);
  return NextResponse.json({ works: [...map.values()] });
}

export async function POST(req: Request) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if ((session.user as { banned?: boolean }).banned) {
    return NextResponse.json({ error: "banned" }, { status: 403 });
  }

  const parsed = workCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = getDb();
  const { userWorks, teams, teamMembers } = schema;
  const userId = session.user.id;

  // A team backs every work so collaborators can be added with roles.
  const [team] = await db
    .insert(teams)
    .values({ name: `${parsed.data.title} — equipe`, ownerId: userId })
    .returning({ id: teams.id });
  await db.insert(teamMembers).values({ teamId: team.id, userId, role: "owner" });

  const slug = `${slugifyWork(parsed.data.title)}-${team.id}`; // team id keeps slugs unique
  const [work] = await db
    .insert(userWorks)
    .values({
      ownerId: userId,
      teamId: team.id,
      title: parsed.data.title,
      slug,
      synopsis: parsed.data.synopsis ?? null,
      status: "draft",
      kind: parsed.data.kind,
      language: parsed.data.kind === "novel" ? (parsed.data.language ?? null) : null,
      categories: parsed.data.categories ?? null,
    })
    .returning({ id: userWorks.id, slug: userWorks.slug });

  return NextResponse.json({ work }, { status: 201 });
}
