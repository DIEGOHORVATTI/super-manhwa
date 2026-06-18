"use client";
import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/Icon";
import { fetchEmojis } from "@/lib/emoji-client";
import { parseBody } from "@/lib/emojis";

type Sticker = { name: string; url: string };

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Convert raw value (with :name: tokens) to HTML for contenteditable. */
function valueToHtml(text: string, map: Record<string, string>): string {
  if (!text) return "";
  return parseBody(text, map)
    .map((seg) =>
      typeof seg === "string"
        ? escHtml(seg).replace(/\n/g, "<br>")
        : `<img class="composer-emoji" data-emoji="${seg.name}" src="${escHtml(seg.url)}" alt=":${seg.name}:" />`,
    )
    .join("");
}

/** Extract raw value (:name: tokens) from contenteditable DOM. */
function getRawValue(root: Node): string {
  let s = "";
  root.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      s += node.textContent ?? "";
    } else {
      const el = node as HTMLElement;
      if (el.tagName === "IMG") {
        s += `:${el.dataset.emoji ?? ""}:`;
      } else if (el.tagName === "BR") {
        s += "\n";
      } else {
        // Chrome/Firefox wrap new paragraphs in <div> in contenteditable
        if (el.tagName === "DIV" && s.length > 0) s += "\n";
        s += getRawValue(el);
      }
    }
  });
  return s;
}

/** Get raw text before the cursor (for autocomplete). */
function textBeforeCursor(root: HTMLElement): string {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.focusNode) return "";
  const range = sel.getRangeAt(0).cloneRange();
  range.selectNodeContents(root);
  range.setEnd(sel.focusNode, sel.focusOffset);
  const temp = document.createElement("div");
  temp.appendChild(range.cloneContents());
  return getRawValue(temp);
}

function StickerPanel({ onPick }: { onPick: (s: Sticker) => void }) {
  const [open, setOpen] = useState(false);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
                    onPick(s);
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
  const editorRef = useRef<HTMLDivElement>(null);
  const stickersRef = useRef<Sticker[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [acQuery, setAcQuery] = useState<string | null>(null);
  const [acIdx, setAcIdx] = useState(0);
  // Track the last value WE produced so we can skip syncing our own changes back
  const internalValueRef = useRef(value);

  useEffect(() => {
    fetchEmojis().then((list) => {
      stickersRef.current = list;
      setStickers(list);
    });
  }, []);

  // Sync external value changes → contenteditable (e.g., clear after submit, pre-fill for edit)
  useEffect(() => {
    const el = editorRef.current;
    if (!el || value === internalValueRef.current) return;
    internalValueRef.current = value;
    const map = Object.fromEntries(stickersRef.current.map((s) => [s.name, s.url]));
    el.innerHTML = valueToHtml(value, map);
  }, [value]);

  /** Insert emoji img at cursor position (from sticker panel). */
  function insertEmojiAt(s: Sticker) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();

    const img = document.createElement("img");
    img.className = "composer-emoji";
    img.dataset.emoji = s.name;
    img.src = s.url;
    img.alt = `:${s.name}:`;
    const space = document.createTextNode(" ");

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(space);
      range.insertNode(img);
      range.setStartAfter(space);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      el.appendChild(img);
      el.appendChild(space);
    }

    emit(el);
  }

  /** Replace ":query" before cursor with emoji img (from autocomplete). */
  function pickFromAutocomplete(s: Sticker) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      const beforeCursor = textNode.textContent!.slice(0, range.startOffset);
      const colonIdx = beforeCursor.lastIndexOf(":");
      if (colonIdx >= 0) {
        const before = textNode.textContent!.slice(0, colonIdx);
        const after = textNode.textContent!.slice(range.startOffset);

        const img = document.createElement("img");
        img.className = "composer-emoji";
        img.dataset.emoji = s.name;
        img.src = s.url;
        img.alt = `:${s.name}:`;
        const space = document.createTextNode(" ");
        const beforeNode = document.createTextNode(before);
        const afterNode = after ? document.createTextNode(after) : null;

        const parent = textNode.parentNode!;
        if (afterNode) parent.insertBefore(afterNode, textNode.nextSibling);
        parent.insertBefore(space, afterNode ?? textNode.nextSibling);
        parent.insertBefore(img, space);
        parent.insertBefore(beforeNode, img);
        parent.removeChild(textNode);

        // Place cursor after the non-breaking space
        const newRange = document.createRange();
        newRange.setStart(space, 1);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    }

    emit(el);
    setAcQuery(null);
    setAcIdx(0);
  }

  function emit(el: HTMLElement) {
    const raw = getRawValue(el);
    internalValueRef.current = raw;
    onChange(raw);
  }

  const acMatches =
    acQuery !== null
      ? stickers.filter((s) => s.name.toLowerCase().startsWith(acQuery.toLowerCase())).slice(0, 8)
      : [];

  function handleInput(e: React.FormEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (maxLength) {
      const raw = getRawValue(el);
      if (raw.length > maxLength) return; // ponytail: no hard truncate, just skip
    }
    emit(el);

    const before = textBeforeCursor(el);
    const m = before.match(/:([a-z0-9_-]*)$/i);
    const q = m ? m[1] : null;
    setAcQuery(q !== null && stickersRef.current.length > 0 ? q : null);
    setAcIdx(0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (acMatches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAcIdx((i) => Math.min(i + 1, acMatches.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAcIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (acMatches[acIdx]) pickFromAutocomplete(acMatches[acIdx]);
        return;
      }
      if (e.key === "Escape") {
        setAcQuery(null);
        return;
      }
    }
  }

  return (
    <div className="composer-area">
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        ref={editorRef}
        className="composer-editor"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        style={{ minHeight: `${rows * 1.5}em` }}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          // insertText is deprecated but universally supported and simplest for plain-text paste
          document.execCommand("insertText", false, text);
        }}
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder ?? "Texto"}
      />
      {acMatches.length > 0 && acQuery !== null && (
        <AutocompleteDropdown
          stickers={stickers}
          query={acQuery}
          onPick={pickFromAutocomplete}
          activeIdx={acIdx}
        />
      )}
      <StickerPanel onPick={insertEmojiAt} />
    </div>
  );
}
