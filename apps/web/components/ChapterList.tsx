"use client";
import Link from "next/link";
import { use, useMemo, useState } from "react";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icon";
import { fmtChapterDate, isRecent, parseChapterNumber } from "@/lib/format";
import { useReadChapters } from "@/lib/library";

type Chapter = { id: string; name: string; lang?: string; dateUpload?: string };
type ChaptersResult = { chapters: Chapter[]; lang: string };

/** Accent/diacritic-insensitive haystack for the in-tab filter. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Chapters rendered before the "ver todos" link | keeps first paint cheap. */
const INITIAL = 21;

/**
 * Chapter grid for the detail page. `use()`s the streamed chapters promise, so
 * it suspends (behind a skeleton) while the cross-source fan-out resolves while
 * the rest of the page | hero, tabs | is already painted. Owns the per-source
 * flag + read-state styling; the live filter `query` is driven from `DetailView`.
 */
export function ChapterList({
  promise,
  query,
  mangaId,
  title,
  lang,
  sortAsc,
}: {
  promise: Promise<ChaptersResult>;
  query: string;
  mangaId: string;
  title: string;
  lang: string;
  sortAsc: boolean;
}) {
  const { chapters } = use(promise);
  const read = useReadChapters(mangaId);
  const [expanded, setExpanded] = useState(false);

  // Show each chapter's real number (parsed from its name); fall back to its
  // position only when the name carries no number, so high/gapped numbering
  // (e.g. a source that starts at Cap. 114) displays faithfully.
  const chapterNo = useMemo(() => {
    const m = new Map<string, number>();
    chapters.forEach((c, i) => m.set(c.id, parseChapterNumber(c.name) ?? chapters.length - i));
    return m;
  }, [chapters]);

  const q = norm(query.trim());
  const shown = useMemo(() => {
    const matched = q
      ? chapters.filter(
          (c) => norm(c.name).includes(q) || String(chapterNo.get(c.id) ?? "").includes(q),
        )
      : chapters;
    // Source order is newest-first; ascending shows oldest-first.
    return sortAsc ? [...matched].reverse() : matched;
  }, [q, chapters, chapterNo, sortAsc]);

  if (shown.length === 0) {
    return (
      <p className="muted">
        {chapters.length === 0 ? "Nenhum capítulo disponível." : "Nenhum capítulo encontrado."}
      </p>
    );
  }

  // Cap the unfiltered browse list to keep first paint cheap; a search shows
  // every match, and "ver todos" reveals the rest.
  const visible = q || expanded ? shown : shown.slice(0, INITIAL);
  const hidden = shown.length - visible.length;

  return (
    <>
      <ul className="chapters-grid">
        {visible.map((c) => {
          const date = fmtChapterDate(c.dateUpload);
          return (
            <li key={c.id}>
              <Link
                className={`chip${read.has(c.id) ? " is-read" : ""}`}
                href={`/read/${c.id}?m=${mangaId}&mn=${encodeURIComponent(title)}&n=${encodeURIComponent(c.name)}`}
                title={read.has(c.id) ? "Lido" : undefined}
              >
                <Flag
                  lang={c.lang ?? lang}
                  size={16}
                  title={c.lang ?? lang}
                  className="chip-flag"
                />
                <span className="chip-main">
                  <span className="chip-no">Cap. {chapterNo.get(c.id)}</span>
                  {date && <span className="chip-date">{date}</span>}
                </span>
                {isRecent(c.dateUpload) && <span className="chip-new">Novo</span>}
                {read.has(c.id) && (
                  <span className="chip-read" aria-label="Lido">
                    <Icon name="circle-check-big" size={12} />
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      {hidden > 0 && (
        <button type="button" className="chapters-more" onClick={() => setExpanded(true)}>
          Ver todos ({shown.length})
        </button>
      )}
    </>
  );
}
