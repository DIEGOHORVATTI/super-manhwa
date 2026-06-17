"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

type BgTheme = "dark" | "sepia" | "white";
type Prefs = { bg: BgTheme; intensity: number; fontSize: number; fontColor: string };

const KEY = "reader:prefs";
const FONT_STEPS = [14, 16, 18, 20, 24, 28, 32, 36];
const DEFAULT: Prefs = { bg: "dark", intensity: 50, fontSize: 18, fontColor: "auto" };

const BG_OPTIONS: { value: BgTheme; label: string; baseColor: string }[] = [
  { value: "dark", label: "Escuro", baseColor: "#191b1c" },
  { value: "sepia", label: "Sépia", baseColor: "#f6edd4" },
  { value: "white", label: "Claro", baseColor: "#ffffff" },
];

const FONT_COLORS = [
  { value: "auto", label: "Auto", swatch: null },
  { value: "#f0ece4", label: "Creme", swatch: "#f0ece4" },
  { value: "#c8c3b8", label: "Cinza", swatch: "#c8c3b8" },
  { value: "#2c2420", label: "Sépia escuro", swatch: "#2c2420" },
];

function computeBgColor(bg: BgTheme, intensity: number): string {
  // intensity: 0 = light/soft, 100 = deep/dark
  const t = intensity / 100;
  if (bg === "dark") {
    // #0d0f14 → #000000
    const l = Math.round(8 - t * 8);
    return `hsl(226, 15%, ${l}%)`;
  }
  if (bg === "sepia") {
    // #faf7f0 (very light) → #c8b890 (strong sepia)
    const l = Math.round(95 - t * 20);
    return `hsl(38, 48%, ${l}%)`;
  }
  // white
  const l = Math.round(100 - t * 8);
  return `hsl(0, 0%, ${l}%)`;
}

function applyPrefs(p: Prefs) {
  const el = document.documentElement;
  el.dataset.readerBg = p.bg;
  el.style.setProperty("--reader-fs", `${p.fontSize}px`);
  el.style.setProperty("--reader-bg", computeBgColor(p.bg, p.intensity));
  el.style.setProperty("--reader-fc", p.fontColor === "auto" ? "" : p.fontColor);
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
            {BG_OPTIONS.map(({ value, label, baseColor }) => (
              <button
                key={value}
                type="button"
                className={`reader-bg-swatch${prefs.bg === value ? " is-active" : ""}`}
                style={{ background: baseColor }}
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

          <p className="reader-settings-label">Intensidade</p>
          <div className="reader-settings-intensity">
            <span className="reader-intensity-label">A</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={prefs.intensity}
              onChange={(e) => update({ intensity: Number(e.target.value) })}
              className="reader-range"
              aria-label="Intensidade do fundo"
            />
            <span className="reader-intensity-label reader-intensity-label-b">A</span>
          </div>

          <p className="reader-settings-label" style={{ marginTop: 14 }}>
            Cor do texto
          </p>
          <div className="reader-settings-bgs">
            {FONT_COLORS.map(({ value, label, swatch }) => (
              <button
                key={value}
                type="button"
                className={`reader-bg-swatch reader-fc-swatch${prefs.fontColor === value ? " is-active" : ""}`}
                style={
                  swatch
                    ? { background: swatch }
                    : { background: "linear-gradient(135deg, #fff 50%, #000 50%)" }
                }
                onClick={() => update({ fontColor: value })}
                title={label}
                aria-pressed={prefs.fontColor === value}
              >
                {prefs.fontColor === value && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={swatch && swatch > "#888" ? "#333" : "#fff"}
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

          <p className="reader-settings-label" style={{ marginTop: 14 }}>
            Tamanho do texto
          </p>
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
