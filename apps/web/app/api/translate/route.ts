import { getChapter } from "@/lib/catalog";
import { translate, translateParagraphs } from "@/lib/translate";

export const runtime = "nodejs";

const CACHE = { "Cache-Control": "public, max-age=31536000, immutable" };

/** Portuguese meaning of one English word (`?w=`), for the reader's word popup. */
async function wordMeaning(word: string) {
  if (word.length > 64) return Response.json({ error: "Parâmetros inválidos" }, { status: 400 });
  try {
    const meaning = await translate(word, "pt", "en");
    return Response.json({ meaning: meaning.trim() }, { headers: CACHE });
  } catch {
    return Response.json({ error: "Falha na tradução" }, { status: 502 });
  }
}

/**
 * English version of a chapter, paragraph-aligned with the Portuguese one. The
 * chapter text doesn't change, so the CDN keeps it for a year: one translation per chapter.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const word = params.get("w")?.trim();
  if (word) return wordMeaning(word);

  const slug = params.get("c") ?? "";
  if (!slug || slug.length > 200) {
    return Response.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const chapter = await getChapter(slug).catch(() => null);
  if (!chapter?.paragraphs.length) {
    return Response.json({ error: "Capítulo não encontrado" }, { status: 404 });
  }

  try {
    const paragraphs = await translateParagraphs(chapter.paragraphs);
    return Response.json({ paragraphs }, { headers: CACHE });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha na tradução" },
      { status: 502 },
    );
  }
}
