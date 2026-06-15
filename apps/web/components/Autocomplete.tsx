"use client";
import type { MangaSummary } from "@packages/contracts";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { routes } from "@/lib/routes";

/** Frontend is pt-br locked, so suggest always filters to pt-br titles. */
const LANG = "pt-br";

/**
 * Search combobox. Debounced fetch → spinner inline while loading → dropdown of
 * matches with cover thumb + lang badge. Click or Enter on a row navigates to
 * /manga/<opaque-id>/<slug> (the frontend never learns which source backed it).
 */
export function Autocomplete() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<MangaSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
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
        const params = new URLSearchParams({ q: Q, lang: LANG });
        const r = await fetch(`${routes.api.mangaSuggest}?${params}`, { signal: ctrl.signal });
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
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (m: MangaSummary) => {
    setOpen(false);
    router.push(routes.manga(m.id, m.name));
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

  // Only while a suggestion fetch is actually in flight AND the field is focused
  // (blurred → no dropdown, so nothing to foreshadow). Focus alone never shows it.
  const showSpinner = focused && loading;

  return (
    <div className={`combobox${open ? " is-open" : ""}`} ref={boxRef}>
      <div className="combobox-input">
        <Icon className="combobox-icon" name="search" size={16} />
        <input
          className="combobox-field"
          value={q}
          placeholder="Buscar mangá pelo nome…"
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => {
            setFocused(true);
            if (items.length > 0) setOpen(true);
          }}
          onBlur={() => {
            setFocused(false);
            setOpen(false);
          }}
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
            <Icon name="x" size={16} />
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
              <span className="combobox-tags">
                {m.chapters !== undefined && (
                  <span className="combobox-chapters">{m.chapters} caps</span>
                )}
                {m.lang && <span className="combobox-lang">{m.lang}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
