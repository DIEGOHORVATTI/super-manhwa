"use client";
import Link from "next/link";
import { use, useMemo } from "react";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icon";
import { useReadChapters } from "@/lib/library";

type Chapter = { id: string; name: string; lang?: string };
type ChaptersResult = { chapters: Chapter[]; lang: string };

/** Accent/diacritic-insensitive haystack for the in-tab filter. */
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Chapter grid for the detail page. `use()`s the streamed chapters promise, so
 * it suspends (behind a skeleton) while the cross-source fan-out resolves while
 * the rest of the page — hero, tabs — is already painted. Owns the per-source
 * flag + read-state styling; the live filter `query` is driven from `DetailView`.
 */
export function ChapterList({
  promise,
  query,
  mangaId,
  title,
  lang,
}: {
  promise: Promise<ChaptersResult>;
  query: string;
  mangaId: string;
  title: string;
  lang: string;
}) {
  const { chapters } = use(promise);
  const read = useReadChapters(mangaId);

  // Sources return chapters newest-first, so the top of the list gets the
  // highest number — number each by position rather than its (inconsistent) name.
  const chapterNo = useMemo(() => {
    const m = new Map<string, number>();
    chapters.forEach((c, i) => m.set(c.id, chapters.length - i));
    return m;
  }, [chapters]);

  const q = norm(query.trim());
  const shown = useMemo(
    () =>
      q
        ? chapters.filter(
            (c) => norm(c.name).includes(q) || String(chapterNo.get(c.id) ?? "").includes(q),
          )
        : chapters,
    [q, chapters, chapterNo],
  );

  if (shown.length === 0) {
    return (
      <p className="muted">
        {chapters.length === 0 ? "Nenhum capítulo disponível." : "Nenhum capítulo encontrado."}
      </p>
    );
  }

  return (
    <ul className="chapters-grid">
      {shown.map((c) => (
        <li key={c.id}>
          <Link
            className={`chip${read.has(c.id) ? " is-read" : ""}`}
            href={`/read/${c.id}?m=${mangaId}&mn=${encodeURIComponent(title)}&n=${encodeURIComponent(c.name)}`}
            title={read.has(c.id) ? "Lido" : undefined}
          >
            <Flag lang={c.lang ?? lang} size={16} title={c.lang ?? lang} className="chip-flag" />
            <span className="chip-no">Cap. {chapterNo.get(c.id)}</span>
            {read.has(c.id) && (
              <span className="chip-read" aria-label="Lido">
                <Icon name="circle-check-big" size={12} />
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
