import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { getWorkAccess } from "@/lib/perms";

/**
 * Tokenized chapter for the interactive reader: ordered tokens + the signed-in
 * user's per-word status (for the colour overlay) + counts. Published chapters
 * are public; other statuses are preview-only for the team.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const chapterId = Number((await ctx.params).id);
  if (!Number.isInteger(chapterId)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const db = getDb();
  const { userChapters, userWorks, chapterTokens, words, userWords } = schema;
  const [chapter] = await db
    .select({ id: userChapters.id, workId: userChapters.workId, status: userChapters.status })
    .from(userChapters)
    .where(eq(userChapters.id, chapterId))
    .limit(1);
  if (!chapter) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [work] = await db
    .select({ language: userWorks.language, kind: userWorks.kind, title: userWorks.title })
    .from(userWorks)
    .where(eq(userWorks.id, chapter.workId))
    .limit(1);
  if (!work || work.kind !== "novel" || !work.language) {
    return NextResponse.json({ error: "not_a_novel" }, { status: 400 });
  }

  const session = await getServerSession();
  const userId = session?.user?.id ?? null;

  if (chapter.status !== "published") {
    const access = await getWorkAccess(chapter.workId, userId);
    if (!access.role) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const tokens = await db
    .select({
      idx: chapterTokens.idx,
      sentenceIdx: chapterTokens.sentenceIdx,
      surface: chapterTokens.surface,
      lemma: chapterTokens.lemma,
      isWord: chapterTokens.isWord,
    })
    .from(chapterTokens)
    .where(eq(chapterTokens.chapterId, chapterId))
    .orderBy(asc(chapterTokens.idx));

  // The user's vocabulary for this language → lemma -> status map.
  const statuses: Record<string, string> = {};
  let known = 0;
  let learning = 0;
  if (userId) {
    const vocab = await db
      .select({ lemma: words.lemma, status: userWords.status })
      .from(userWords)
      .innerJoin(words, eq(userWords.wordId, words.id))
      .where(and(eq(userWords.userId, userId), eq(words.language, work.language)));
    for (const v of vocab) {
      statuses[v.lemma] = v.status;
      if (v.status === "known") known++;
      else if (v.status === "learning") learning++;
    }
  }

  return NextResponse.json({
    language: work.language,
    title: work.title,
    tokens,
    statuses,
    counts: { known, learning },
  });
}
