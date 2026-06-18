"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { fetchEmojis } from "@/lib/emoji-client";

type Sticker = { name: string; url: string };

/** Extrai a query de autocomplete após o último ":" não fechado antes do cursor. */
function getColonQuery(value: string, cursor: number): string | null {
  const before = value.slice(0, cursor);
  const match = before.match(/:([a-z0-9_-]*)$/i);
  return match ? match[1] : null;
}

function StickerPanel({ onPick }: { onPick: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || loaded) return;
    fetchEmojis().then((list) => {
      setStickers(list);
      setLoaded(true);
    });
  }, [open, loaded]);

  // pré-carrega assim que o composer montar (evita delay ao primeiro clique)
  useEffect(() => {
    fetchEmojis().then((list) => {
      setStickers(list);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="sticker-wrap" ref={ref}>
      <button
        type="button"
        className={`sticker-trigger${open ? " is-active" : ""}`}
        onClick={() => setOpen((o) => !o)}
        title="Figurinhas"
        aria-label="Abrir painel de figurinhas"
        aria-expanded={open}
      >
        <Icon name="smile" size={18} />
      </button>

      {open && (
        <div className="sticker-panel" role="dialog" aria-label="Figurinhas">
          {!loaded || stickers.length === 0 ? (
            <p className="sticker-empty">
              {loaded ? "Nenhuma figurinha disponível." : "Carregando…"}
            </p>
          ) : (
            <div className="sticker-grid">
              {stickers.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  className="sticker-btn"
                  title={`:${s.name}:`}
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    onPick(`:${s.name}:`);
                    setOpen(false);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.url} alt={s.name} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AutocompleteDropdown({
  stickers,
  query,
  onPick,
  activeIdx,
}: {
  stickers: Sticker[];
  query: string;
  onPick: (s: Sticker) => void;
  activeIdx: number;
}) {
  const matches = stickers
    .filter((s) => s.name.toLowerCase().startsWith(query.toLowerCase()))
    .slice(0, 8);

  if (matches.length === 0) return null;

  return (
    <div className="sticker-autocomplete" role="listbox">
      {matches.map((s, i) => (
        <button
          key={s.name}
          type="button"
          role="option"
          aria-selected={i === activeIdx}
          className={`sticker-ac-item${i === activeIdx ? " is-active" : ""}`}
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(s);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.url} alt={s.name} />
          <span>:{s.name}:</span>
        </button>
      ))}
    </div>
  );
}

export function ComposerArea({
  value,
  onChange,
  rows = 3,
  placeholder,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [acQuery, setAcQuery] = useState<string | null>(null);
  const [acIdx, setAcIdx] = useState(0);

  useEffect(() => {
    fetchEmojis().then(setStickers);
  }, []);

  const acMatches =
    acQuery !== null
      ? stickers.filter((s) => s.name.toLowerCase().startsWith(acQuery.toLowerCase())).slice(0, 8)
      : [];

  const insertText = (text: string) => {
    const el = ref.current;
    if (!el) {
      onChange(value + text);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + text.length;
      el.focus();
    });
  };

  const pickFromAutocomplete = (s: Sticker) => {
    const el = ref.current;
    if (!el) {
      insertText(`:${s.name}:`);
      setAcQuery(null);
      return;
    }
    const cursor = el.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    // substituir ":query" pelo ":name: "
    const replaced = before.replace(/:([a-z0-9_-]*)$/i, `:${s.name}: `);
    const next = replaced + value.slice(cursor);
    onChange(next);
    const newCursor = replaced.length;
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = newCursor;
      el.focus();
    });
    setAcQuery(null);
    setAcIdx(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (acMatches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAcIdx((i) => Math.min(i + 1, acMatches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAcIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (acMatches[acIdx]) pickFromAutocomplete(acMatches[acIdx]);
    } else if (e.key === "Escape") {
      setAcQuery(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    const cursor = e.target.selectionStart ?? e.target.value.length;
    const q = getColonQuery(e.target.value, cursor);
    setAcQuery(q !== null && stickers.length > 0 ? q : null);
    setAcIdx(0);
  };

  return (
    <div className="composer-area">
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
        maxLength={maxLength}
      />
      {acMatches.length > 0 && acQuery !== null && (
        <AutocompleteDropdown
          stickers={stickers}
          query={acQuery}
          onPick={pickFromAutocomplete}
          activeIdx={acIdx}
        />
      )}
      <StickerPanel onPick={insertText} />
    </div>
  );
}
