import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { persistChapterText } from "@/lib/learning/persist-chapter";
import type { LearnLanguage } from "@/lib/learning/tokenize";
import { getWorkAccess } from "@/lib/perms";
import { textChapterCreateSchema } from "@/lib/schemas/studio";

/**
 * Create a TEXT chapter for a novel work. The body text is tokenized and cached
 * (tokens + sentences + dictionary lemmas) on save, so the reading layer never
 * tokenizes at request time. Requires a team role that can edit chapters.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  const workId = Number((await ctx.params).id);
  if (!Number.isInteger(workId))
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const access = await getWorkAccess(workId, session?.user?.id ?? null);
  if (!access.canEditChapters) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getDb();
  const { userWorks, userChapters } = schema;
  const [work] = await db
    .select({ kind: userWorks.kind, language: userWorks.language })
    .from(userWorks)
    .where(eq(userWorks.id, workId))
    .limit(1);
  if (!work || work.kind !== "novel" || !work.language) {
    return NextResponse.json({ error: "not_a_novel" }, { status: 400 });
  }

  const parsed = textChapterCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "bad_request" },
      { status: 400 },
    );
  }

  const [chapter] = await db
    .insert(userChapters)
    .values({
      workId,
      number: parsed.data.number,
      title: parsed.data.title ?? null,
      status: "draft",
      createdBy: session!.user.id,
    })
    .returning({ id: userChapters.id });

  const stats = await persistChapterText(
    chapter.id,
    work.language as LearnLanguage,
    parsed.data.content,
  );

  return NextResponse.json({ chapter: { id: chapter.id, ...stats } }, { status: 201 });
}
