import type { Chapter } from "@packages/contracts";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { chapterHref, chapterNav } from "@/lib/reader";
import { mangaHref } from "@/lib/slug";

/**
 * End-of-chapter navigation rendered after the page images. Big prev/next CTAs so
 * a reader who reaches the bottom can move on without scrolling back to the top
 * toolbar. Pure links — no client JS needed.
 */
export function ReaderChapterEnd({
  chapters,
  currentId,
  mangaId,
  mangaName,
}: {
  chapters: Chapter[];
  currentId: string;
  mangaId: string;
  mangaName: string;
}) {
  const { prev, next } = chapterNav(chapters, currentId);
  const href = (c: Chapter) => chapterHref(c, mangaId, mangaName);

  return (
    <nav className="reader-end" aria-label="Navegação de capítulos">
      {prev ? (
        <Link className="reader-end-btn" href={href(prev)}>
          <Icon name="chevron-left" size={18} />
          <span className="reader-end-stack">
            <small>Anterior</small>
            <strong>{prev.name}</strong>
          </span>
        </Link>
      ) : (
        <span className="reader-end-btn is-disabled">
          <Icon name="chevron-left" size={18} />
          <span className="reader-end-stack">
            <small>Anterior</small>
            <strong>Primeiro capítulo</strong>
          </span>
        </span>
      )}

      <Link className="reader-end-series" href={mangaHref(mangaId, mangaName)} title={mangaName}>
        <Icon name="book-open" size={18} />
        <span>Todos os capítulos</span>
      </Link>

      {next ? (
        <Link className="reader-end-btn reader-end-next" href={href(next)}>
          <span className="reader-end-stack">
            <small>Próximo</small>
            <strong>{next.name}</strong>
          </span>
          <Icon name="chevron-right" size={18} />
        </Link>
      ) : (
        <span className="reader-end-btn reader-end-next is-disabled">
          <span className="reader-end-stack">
            <small>Próximo</small>
            <strong>Último capítulo</strong>
          </span>
          <Icon name="chevron-right" size={18} />
        </span>
      )}
    </nav>
  );
}
