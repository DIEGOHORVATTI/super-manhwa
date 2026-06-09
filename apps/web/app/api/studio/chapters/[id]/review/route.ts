import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { getWorkAccess } from "@/lib/perms";
import { reviewSchema } from "@/lib/schemas/studio";

/**
 * Submit a review decision for a chapter (reviewer/editor/owner). "approved"
 * moves the chapter to draft-ready (editor can then publish/schedule);
 * "changes_requested" sends it back to draft with the reviewer's note recorded.
 */

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = getDb();
  const { userChapters, chapterReviews } = schema;
  const [chapter] = await db.select().from(userChapters).where(eq(userChapters.id, id)).limit(1);
  if (!chapter) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const access = await getWorkAccess(chapter.workId, session?.user?.id ?? null);
  if (!access.canReview) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = reviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  await db.insert(chapterReviews).values({
    chapterId: id,
    reviewerId: session!.user.id,
    decision: parsed.data.decision,
    note: parsed.data.note ?? null,
  });

  // Approved → ready (draft, but reviewedBy stamped); changes → back to draft.
  await db
    .update(userChapters)
    .set({
      status: "draft",
      reviewedBy: parsed.data.decision === "approved" ? session!.user.id : null,
    })
    .where(eq(userChapters.id, id));

  return NextResponse.json({ ok: true });
}
