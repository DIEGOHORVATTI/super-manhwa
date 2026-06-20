"use client";
import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/Icon";
import { fetchEmojis } from "@/lib/emoji-client";

type Emote = { name: string; url: string };

/**
 * Pick a custom emote (the same images used in comments) for a tag. Shows the
 * current pick, opens a searchable grid, and resolves names → URLs from
 * /api/emojis. `value` is the emote name; `null` means none.
 */
export function EmotePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (name: string | null) => void;
}) {
  const [emotes, setEmotes] = useState<Emote[]>([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchEmojis().then(setEmotes);
  }, []);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = emotes.find((e) => e.name === value) ?? null;
  const shown = q ? emotes.filter((e) => e.name.toLowerCase().includes(q.toLowerCase())) : emotes;

  return (
    <div className="emote-picker" ref={ref}>
      <button
        type="button"
        className="emote-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.url} alt={value ?? ""} className="emote-img" />
        ) : value ? (
          <span className="muted">:{value}:</span>
        ) : (
          <span className="muted">Sem emote</span>
        )}
        <Icon name="chevron-down" size={14} />
      </button>

      {open && (
        <div className="emote-pop" role="dialog">
          <div className="emote-search">
            <Icon name="search" size={14} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar emote…"
            />
          </div>
          <div className="emote-grid">
            <button
              type="button"
              className={`emote-cell emote-none${value ? "" : " is-active"}`}
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              title="Nenhum"
            >
              <Icon name="x" size={16} />
            </button>
            {shown.map((e) => (
              <button
                key={e.name}
                type="button"
                className={`emote-cell${e.name === value ? " is-active" : ""}`}
                onClick={() => {
                  onChange(e.name);
                  setOpen(false);
                }}
                title={`:${e.name}:`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.url} alt={e.name} className="emote-img" />
              </button>
            ))}
            {shown.length === 0 && <p className="muted emote-empty">Nenhum emote encontrado.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
