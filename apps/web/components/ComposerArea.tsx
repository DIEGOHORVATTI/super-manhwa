"use client";
import { useEffect, useRef, useState } from "react";
import { fetchEmojis } from "@/lib/emoji-client";
import { Icon } from "@/components/Icon";

type Sticker = { name: string; url: string };

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
      >
        <Icon name="smile" size={16} />
      </button>

      {open && (
        <div className="sticker-panel" aria-label="Figurinhas">
          {!loaded ? (
            <p className="sticker-empty">Carregando…</p>
          ) : stickers.length === 0 ? (
            <p className="sticker-empty">Nenhuma figurinha disponível.</p>
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

  return (
    <div className="composer-area">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        maxLength={maxLength}
      />
      <StickerPanel onPick={insertText} />
    </div>
  );
}
