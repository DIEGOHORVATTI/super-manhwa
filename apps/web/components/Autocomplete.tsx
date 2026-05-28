"use client";
import type { MangaSummary } from "@packages/contracts";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Search combobox. Debounced fetch → spinner inline while loading → dropdown of
 * matches with cover thumb + lang badge. Click or Enter on a row navigates to
 * /manga/<opaque-id>?n=<name> (the frontend never learns which source backed it).
 */
export function Autocomplete({ lang = "" }: { lang?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<MangaSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [navigating, setNavigating] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const Q = q.trim();
    if (Q.length < 2) {
      setItems([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: Q });
        if (lang) params.set("lang", lang);
        const r = await fetch(`/api/manga/suggest?${params}`, { signal: ctrl.signal });
        if (!r.ok) throw new Error(`${r.status}`);
        const data = (await r.json()) as { list: MangaSummary[] };
        setItems(data.list ?? []);
        setActive(0);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setItems([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, lang]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (m: MangaSummary) => {
    setNavigating(true);
    setOpen(false);
    router.push(`/manga/${m.id}?n=${encodeURIComponent(m.name)}`);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(items[active]);
    } else if (e.key === "Escape") setOpen(false);
  };

  const showSpinner = loading || navigating;

  return (
    <div className={`combobox${open ? " is-open" : ""}`} ref={boxRef}>
      <div className="combobox-input">
        <svg
          className="combobox-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          className="combobox-field"
          value={q}
          placeholder="Buscar mangá pelo nome…"
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => items.length > 0 && setOpen(true)}
          onKeyDown={onKey}
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {showSpinner && <span className="spinner" aria-label="carregando" />}
        {!showSpinner && q && (
          <button
            className="combobox-clear"
            onClick={() => {
              setQ("");
              setItems([]);
              setOpen(false);
            }}
            aria-label="limpar"
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <ul className="combobox-list" role="listbox">
          {loading && items.length === 0 && (
            <>
              {[0, 1, 2].map((i) => (
                <li key={i} className="combobox-item is-skeleton">
                  <span className="combobox-thumb skeleton" />
                  <span className="combobox-name skeleton skeleton-text" />
                </li>
              ))}
            </>
          )}
          {!loading && items.length === 0 && <li className="combobox-empty">nada encontrado</li>}
          {items.map((m, i) => (
            <li
              key={m.id}
              role="option"
              aria-selected={i === active}
              className={`combobox-item${i === active ? " is-active" : ""}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                go(m);
              }}
            >
              {m.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="combobox-thumb" src={m.imageUrl} alt="" loading="lazy" />
              ) : (
                <span className="combobox-thumb combobox-thumb-empty" />
              )}
              <span className="combobox-name">{m.name}</span>
              <span className="combobox-lang">{m.lang}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
