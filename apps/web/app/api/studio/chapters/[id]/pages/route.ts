import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { getWorkAccess } from "@/lib/perms";
import { publicUrlFor } from "@/lib/r2";

/**
 * Ordered page image URLs for a chapter. Published chapters are public; any
 * other status (draft/in_review/scheduled) is preview-only and requires a team
 * role — this powers the studio preview before publishing.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = getDb();
  const { userChapters, chapterPages } = schema;
  const [chapter] = await db.select().from(userChapters).where(eq(userChapters.id, id)).limit(1);
  if (!chapter) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (chapter.status !== "published") {
    const session = await getServerSession();
    const access = await getWorkAccess(chapter.workId, session?.user?.id ?? null);
    if (!access.role) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const pages = await db
    .select({ index: chapterPages.index, r2Key: chapterPages.r2Key })
    .from(chapterPages)
    .where(eq(chapterPages.chapterId, id))
    .orderBy(asc(chapterPages.index));

  return NextResponse.json({
    chapter: { id: chapter.id, number: chapter.number, title: chapter.title, status: chapter.status },
    pages: pages.map((p) => ({ index: p.index, url: publicUrlFor(p.r2Key) })),
  });
}
