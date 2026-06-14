import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { getWorkAccess } from "@/lib/perms";
import { chapterActionSchema } from "@packages/contracts";

/**
 * Chapter lifecycle transitions. Allowed actions depend on the work role:
 *   submit    — draft → in_review            (translator/editor/owner)
 *   schedule  — in_review|draft → scheduled  (editor/owner; needs scheduledAt)
 *   publish   — * → published                (editor/owner)
 *   unpublish — published → draft            (editor/owner)
 * Publishing also flips the parent work to "published" on its first chapter.
 */
async function loadChapter(id: number) {
  const db = getDb();
  const { userChapters } = schema;
  const [row] = await db.select().from(userChapters).where(eq(userChapters.id, id)).limit(1);
  return row ?? null;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const chapter = await loadChapter(id);
  if (!chapter) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const access = await getWorkAccess(chapter.workId, session?.user?.id ?? null);
  const parsed = chapterActionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { action } = parsed.data;

  const canSubmit = access.canEditChapters;
  const canManage = access.canPublish; // editor/owner
  if (action === "submit" && !canSubmit)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (action !== "submit" && !canManage)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getDb();
  const { userChapters, userWorks } = schema;
  const now = new Date();
  const set: Partial<typeof userChapters.$inferInsert> = {};
  if (parsed.data.number) set.number = parsed.data.number;
  if (parsed.data.title !== undefined) set.title = parsed.data.title;

  if (action === "submit") set.status = "in_review";
  else if (action === "schedule") {
    if (!parsed.data.scheduledAt)
      return NextResponse.json({ error: "needs_date" }, { status: 400 });
    set.status = "scheduled";
    set.scheduledAt = new Date(parsed.data.scheduledAt);
  } else if (action === "publish") {
    set.status = "published";
    set.publishedAt = now;
    set.scheduledAt = null;
  } else if (action === "unpublish") {
    set.status = "draft";
    set.publishedAt = null;
  }

  const [updated] = await db
    .update(userChapters)
    .set(set)
    .where(eq(userChapters.id, id))
    .returning();

  if (action === "publish") {
    await db.update(userWorks).set({ status: "published" }).where(eq(userWorks.id, chapter.workId));
  }
  return NextResponse.json({ chapter: updated });
}
