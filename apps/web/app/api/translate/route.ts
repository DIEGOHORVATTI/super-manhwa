import { getChapter } from "@/lib/catalog";
import { translateParagraphs } from "@/lib/translate";

export const runtime = "nodejs";

/**
 * English version of a chapter, paragraph-aligned with the Portuguese one. The
 * chapter text doesn't change, so the CDN keeps it for a year: one translation per chapter.
 */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("c") ?? "";
  if (!slug || slug.length > 200) {
    return Response.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const chapter = await getChapter(slug).catch(() => null);
  if (!chapter?.paragraphs.length) {
    return Response.json({ error: "Capítulo não encontrado" }, { status: 404 });
  }

  try {
    const paragraphs = await translateParagraphs(chapter.paragraphs);
    return Response.json(
      { paragraphs },
      { headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha na tradução" },
      { status: 502 },
    );
  }
}
