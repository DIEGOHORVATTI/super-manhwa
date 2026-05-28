"use client";
import type { Chapter } from "@packages/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Sticky reader toolbar. Server fetches the manga detail once, hands us the full
 * chapter list + the current chapter id, and we render the navigation client-side
 * so the combobox can be interactive without a full reload between chapters.
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
  // Detail returns chapters newest-first; "prev" means lower chapter number, which
  // is the NEXT index in this list. We expose it as "anterior/próximo" in reading
  // direction (most recent → oldest is unusual, so reading direction is index+1).
  const idx = chapters.findIndex((c) => c.id === currentId);
  const prev = idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : null;
  const next = idx > 0 ? chapters[idx - 1] : null;

  const hrefFor = (c: Chapter) =>
    `/read/${c.id}?m=${mangaId}&mn=${encodeURIComponent(mangaName)}&n=${encodeURIComponent(c.name)}`;

  // Combobox state — type to filter, click to jump.
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

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

  const go = (c: Chapter) => {
    setOpen(false);
    router.push(hrefFor(c));
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

  const current = chapters[idx];

  return (
    <div className="reader-nav">
      <Link
        className="btn"
        href={`/manga/${mangaId}?n=${encodeURIComponent(mangaName)}`}
        title="Voltar para a obra"
      >
        ← {mangaName}
      </Link>

      <div className="reader-nav-spacer" />

      {prev ? (
        <Link className="btn" href={hrefFor(prev)} title={prev.name}>
          ← anterior
        </Link>
      ) : (
        <span className="btn btn-disabled">← anterior</span>
      )}

      <div className="combobox reader-chap-picker" ref={boxRef}>
        <input
          className="field"
          value={open ? q : (current?.name ?? "—")}
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
        <Link className="btn" href={hrefFor(next)} title={next.name}>
          próximo →
        </Link>
      ) : (
        <span className="btn btn-disabled">próximo →</span>
      )}
    </div>
  );
}
