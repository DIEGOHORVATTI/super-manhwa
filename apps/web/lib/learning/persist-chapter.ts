import "server-only";
import { eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import { type LearnLanguage, tokenize } from "@/lib/learning/tokenize";

/**
 * Pre-tokenizes a novel chapter's text and persists it (raw text + tokens +
 * sentences) plus upserts the distinct lemmas into the `words` dictionary. Runs
 * once at chapter save | never at read time. Re-running replaces prior rows so
 * an edit re-tokenizes cleanly.
 */
export async function persistChapterText(
  chapterId: number,
  language: LearnLanguage,
  content: string,
): Promise<{ tokens: number; sentences: number; lemmas: number }> {
  const db = getDb();
  const { chapterTexts, chapterTokens, sentences, words } = schema;

  const tc = tokenize(content, language);

  // Idempotent: clear any previous tokenization for this chapter.
  await db.delete(chapterTokens).where(eq(chapterTokens.chapterId, chapterId));
  await db.delete(sentences).where(eq(sentences.chapterId, chapterId));

  await db
    .insert(chapterTexts)
    .values({ chapterId, language, content })
    .onConflictDoUpdate({ target: chapterTexts.chapterId, set: { language, content } });

  if (tc.sentences.length) {
    await db
      .insert(sentences)
      .values(tc.sentences.map((s) => ({ chapterId, idx: s.idx, text: s.text })));
  }

  if (tc.tokens.length) {
    // Chunk inserts to stay within parameter limits.
    const rows = tc.tokens.map((t) => ({
      chapterId,
      idx: t.idx,
      sentenceIdx: t.sentenceIdx,
      surface: t.surface,
      lemma: t.lemma,
      isWord: t.isWord,
    }));
    for (let i = 0; i < rows.length; i += 500) {
      await db.insert(chapterTokens).values(rows.slice(i, i + 500));
    }
  }

  // Upsert distinct lemmas into the dictionary (definitions filled by a later
  // dictionary-import phase; here we just register the headwords).
  const lemmas = [...new Set(tc.tokens.filter((t) => t.isWord && t.lemma).map((t) => t.lemma!))];
  if (lemmas.length) {
    for (let i = 0; i < lemmas.length; i += 500) {
      await db
        .insert(words)
        .values(lemmas.slice(i, i + 500).map((lemma) => ({ language, lemma })))
        .onConflictDoNothing();
    }
  }

  return { tokens: tc.tokens.length, sentences: tc.sentences.length, lemmas: lemmas.length };
}
