"use client";
import type { Chapter } from "@packages/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { ReaderSettings } from "@/components/ReaderSettings";
import { chapterHref, chapterNav } from "@/lib/reader";
import { routes } from "@/lib/routes";

/**
 * Sticky reader toolbar. Server fetches the manga detail once, hands us the full
 * chapter list + the current chapter id, and we render the navigation client-side
 * so the combobox can be interactive without a full reload between chapters.
 *
 * Extras: a top reading-progress bar driven by scroll, ←/→ keyboard shortcuts to
 * flip chapters (ignored while the combobox is focused), and a scroll-to-top FAB.
 */
export function ReaderNav({
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
  const router = useRouter();
  const { idx, prev, next, current } = chapterNav(chapters, currentId);
  const href = (c: Chapter) => chapterHref(c, mangaId, mangaName);

  // Combobox state | type to filter, click to jump.
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = q.trim()
    ? chapters.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    : chapters;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Reading progress + scroll-to-top visibility.
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? Math.min(1, h.scrollTop / max) : 0);
      setShowTop(h.scrollTop > 800);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ←/→ flip chapters in reading direction, unless typing in the combobox.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open || document.activeElement === inputRef.current) return;
      if (e.key === "ArrowLeft" && prev) router.push(href(prev));
      else if (e.key === "ArrowRight" && next) router.push(href(next));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prev, next]);

  const go = (c: Chapter) => {
    setOpen(false);
    router.push(href(c));
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active]) go(filtered[active]);
    } else if (e.key === "Escape") setOpen(false);
  };

  const total = chapters.length;
  const position = idx >= 0 ? total - idx : 0; // human reading order (1 = oldest)

  return (
    <>
      <div className="reader-nav">
        <div className="reader-progress" style={{ transform: `scaleX(${progress})` }} />

        <Link
          className="reader-btn reader-btn-series"
          href={routes.manga(mangaId, mangaName)}
          title={`Voltar para ${mangaName}`}
        >
          <Icon name="book-open" size={16} />
          <span className="reader-series-name">{mangaName}</span>
        </Link>

        <ReaderSettings />

        <div className="reader-nav-spacer" />

        {position > 0 && (
          <span className="reader-count" aria-hidden="true">
            {position}/{total}
          </span>
        )}

        {prev ? (
          <Link
            className="reader-btn reader-btn-icon"
            href={href(prev)}
            title={`Anterior: ${prev.name}`}
          >
            <Icon name="chevron-left" size={18} />
          </Link>
        ) : (
          <span className="reader-btn reader-btn-icon is-disabled" aria-disabled="true">
            <Icon name="chevron-left" size={18} />
          </span>
        )}

        <div className="combobox reader-chap-picker" ref={boxRef}>
          <Icon name="list" size={15} className="reader-chap-icon" />
          <input
            ref={inputRef}
            className="reader-chap-field"
            value={open ? q : (current?.name ?? "|")}
            placeholder="Capítulo…"
            onFocus={() => {
              setQ("");
              setOpen(true);
              setActive(0);
            }}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              setActive(0);
            }}
            onKeyDown={onKey}
            aria-label="Selecionar capítulo"
          />
          <Icon name="chevron-down" size={15} className="reader-chap-caret" />
          {open && (
            <ul className="combobox-list" role="listbox">
              {filtered.length === 0 && <li className="combobox-empty">sem resultados</li>}
              {filtered.slice(0, 200).map((c, i) => (
                <li
                  key={c.id}
                  role="option"
                  aria-selected={i === active}
                  className={`combobox-item${i === active ? " is-active" : ""}${c.id === currentId ? " is-current" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    go(c);
                  }}
                >
                  <span className="combobox-name">{c.name}</span>
                  {c.scanlator && <span className="combobox-lang">{c.scanlator}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {next ? (
          <Link
            className="reader-btn reader-btn-icon"
            href={href(next)}
            title={`Próximo: ${next.name}`}
          >
            <Icon name="chevron-right" size={18} />
          </Link>
        ) : (
          <span className="reader-btn reader-btn-icon is-disabled" aria-disabled="true">
            <Icon name="chevron-right" size={18} />
          </span>
        )}
      </div>

      <button
        type="button"
        className={`reader-top${showTop ? " is-visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Voltar ao topo"
        title="Voltar ao topo"
      >
        <Icon name="chevron-up" size={20} />
      </button>
    </>
  );
}
