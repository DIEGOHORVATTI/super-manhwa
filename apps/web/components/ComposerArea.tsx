"use client";
import { useEffect, useRef, useState } from "react";
import { fetchEmojis } from "@/lib/emoji-client";
import { UNICODE_EMOJIS } from "@/lib/emojis";

type CustomEmoji = { name: string; url: string };

function EmojiPicker({ onPick }: { onPick: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState<CustomEmoji[]>([]);
  const [tab, setTab] = useState<"unicode" | "custom">("unicode");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    fetchEmojis().then(setCustom);
  }, [open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="emoji-picker-wrap" ref={ref}>
      <button
        type="button"
        className="emoji-trigger"
        onClick={() => setOpen((o) => !o)}
        title="Emojis"
        aria-label="Abrir seletor de emojis"
      >
        😊
      </button>
      {open && (
        <div className="emoji-picker" aria-label="Emojis">
          {custom.length > 0 && (
            <div className="emoji-tabs">
              <button
                type="button"
                className={`emoji-tab${tab === "unicode" ? " is-active" : ""}`}
                onClick={() => setTab("unicode")}
              >
                😊
              </button>
              <button
                type="button"
                className={`emoji-tab${tab === "custom" ? " is-active" : ""}`}
                onClick={() => setTab("custom")}
              >
                ✦
              </button>
            </div>
          )}

          <div className="emoji-grid">
            {tab === "unicode"
              ? UNICODE_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className="emoji-btn"
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      onPick(e);
                      setOpen(false);
                    }}
                  >
                    {e}
                  </button>
                ))
              : custom.map((e) => (
                  <button
                    key={e.name}
                    type="button"
                    className="emoji-btn emoji-btn-img"
                    title={`:${e.name}:`}
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      onPick(`:${e.name}:`);
                      setOpen(false);
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={e.url} alt={e.name} />
                  </button>
                ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Textarea with an emoji picker button. Shared between Comments and DonateView.
 * The emoji picker loads custom image emojis from /api/emojis lazily on first open.
 */
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
      <EmojiPicker onPick={insertText} />
    </div>
  );
}
