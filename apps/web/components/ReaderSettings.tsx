"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

type BgTheme = "dark" | "sepia" | "white";
type Prefs = { bg: BgTheme; fontSize: number };

const KEY = "reader:prefs";
const FONT_STEPS = [14, 16, 18, 20, 24, 28, 32, 36];
const DEFAULT: Prefs = { bg: "dark", fontSize: 18 };

const BG_OPTIONS: { value: BgTheme; label: string; color: string }[] = [
  { value: "dark", label: "Escuro", color: "#191b1c" },
  { value: "sepia", label: "Sépia", color: "#f6edd4" },
  { value: "white", label: "Claro", color: "#ffffff" },
];

function applyPrefs(p: Prefs) {
  document.documentElement.dataset.readerBg = p.bg;
  document.documentElement.style.setProperty("--reader-fs", `${p.fontSize}px`);
}

export function ReaderSettings() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored: Prefs = { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
      setPrefs(stored);
      applyPrefs(stored);
    } catch {}
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const update = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    localStorage.setItem(KEY, JSON.stringify(next));
    applyPrefs(next);
  };

  const fontIdx = FONT_STEPS.indexOf(prefs.fontSize);

  return (
    <div className="reader-settings" ref={ref}>
      <button
        type="button"
        className={`reader-btn reader-btn-icon${open ? " is-active" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Personalizar leitor"
        title="Personalizar leitor"
      >
        <Icon name="settings" size={16} />
      </button>

      {open && (
        <div className="reader-settings-panel" role="dialog" aria-label="Configurações do leitor">
          <p className="reader-settings-label">Fundo</p>
          <div className="reader-settings-bgs">
            {BG_OPTIONS.map(({ value, label, color }) => (
              <button
                key={value}
                type="button"
                className={`reader-bg-swatch${prefs.bg === value ? " is-active" : ""}`}
                style={{ background: color }}
                onClick={() => update({ bg: value })}
                title={label}
                aria-pressed={prefs.bg === value}
              >
                {prefs.bg === value && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          <p className="reader-settings-label">Tamanho do texto</p>
          <div className="reader-settings-size">
            <button
              type="button"
              className="reader-size-btn"
              disabled={fontIdx <= 0}
              onClick={() => update({ fontSize: FONT_STEPS[Math.max(0, fontIdx - 1)] })}
              aria-label="Diminuir fonte"
            >
              A-
            </button>
            <span className="reader-size-val">{prefs.fontSize}</span>
            <button
              type="button"
              className="reader-size-btn"
              disabled={fontIdx >= FONT_STEPS.length - 1}
              onClick={() =>
                update({ fontSize: FONT_STEPS[Math.min(FONT_STEPS.length - 1, fontIdx + 1)] })
              }
              aria-label="Aumentar fonte"
            >
              A+
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
