import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";

/**
 * AniList account linking. Unlike the favourites sync (which keeps the token in
 * localStorage), this persists the AniList identity against the signed-in user
 * in the `account` table, so one user can attach several AniList accounts.
 *
 * POST { token } — resolves the AniList viewer via GraphQL and upserts the link.
 * GET            — lists the current user's linked AniList accounts.
 */
const ENDPOINT = "https://graphql.anilist.co";

async function fetchViewer(token: string): Promise<{ id: number; name: string } | null> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: "query { Viewer { id name } }" }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { Viewer?: { id: number; name: string } } };
    return json.data?.Viewer ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  if (!dbEnabled) return NextResponse.json({ accounts: [] });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getDb();
  const { account } = schema;
  const rows = await db
    .select({ accountId: account.accountId, scope: account.scope })
    .from(account)
    .where(and(eq(account.userId, session.user.id), eq(account.providerId, "anilist")));
  // `scope` reused to stash the AniList display name (no real OAuth scopes here).
  return NextResponse.json({
    accounts: rows.map((r) => ({ id: r.accountId, name: r.scope ?? r.accountId })),
  });
}

const LinkSchema = z.object({ token: z.string().min(10) });

export async function POST(req: Request) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = LinkSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const viewer = await fetchViewer(parsed.data.token);
  if (!viewer) return NextResponse.json({ error: "anilist_unreachable" }, { status: 502 });

  const db = getDb();
  const { account } = schema;
  const accountId = String(viewer.id);
  const now = new Date();

  // One AniList account links to one platform user — re-linking updates the token.
  const existing = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.providerId, "anilist"), eq(account.accountId, accountId)))
    .limit(1);

  if (existing.length) {
    await db
      .update(account)
      .set({ userId: session.user.id, accessToken: parsed.data.token, scope: viewer.name, updatedAt: now })
      .where(eq(account.id, existing[0].id));
  } else {
    await db.insert(account).values({
      id: `anilist:${accountId}:${session.user.id}`,
      userId: session.user.id,
      providerId: "anilist",
      accountId,
      accessToken: parsed.data.token,
      scope: viewer.name,
      createdAt: now,
      updatedAt: now,
    });
  }
  return NextResponse.json({ linked: { id: accountId, name: viewer.name } });
}
