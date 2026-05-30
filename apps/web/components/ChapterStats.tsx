"use client";
import { use, useMemo } from "react";
import { Flag, langLabel } from "@/components/Flag";

type Chapter = { id: string; name: string; lang?: string };
type ChaptersResult = { chapters: Chapter[]; lang: string };

/**
 * Per-work language mix, computed from the merged chapters. A work can carry
 * some pt-br + some en chapters (different connectors), so we count each language
 * and surface the share.
 */
const breakdownOf = (chapters: Chapter[], lang: string) => {
  const counts = new Map<string, number>();
  for (const c of chapters) {
    const code = (c.lang ?? lang).toLowerCase();
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  const total = chapters.length || 1;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([code, count]) => ({ code, count, pct: Math.round((count / total) * 100) }));
};

/**
 * Chapter-derived stats for the detail page — count + language mix. Both depend
 * on the streamed chapters, so this `use()`s the same promise as the chapter
 * list and renders inside its own Suspense boundary, letting the hero paint
 * immediately. `flags` powers the hero meta row; `breakdown` the "Sobre" tab.
 */
export function ChapterStats({
  promise,
  lang,
  variant,
}: {
  promise: Promise<ChaptersResult>;
  lang: string;
  variant: "flags" | "breakdown";
}) {
  const { chapters } = use(promise);
  const breakdown = useMemo(() => breakdownOf(chapters, lang), [chapters, lang]);

  if (variant === "flags") {
    return (
      <>
        <span className="muted">{chapters.length} capítulos</span>
        {breakdown.length > 0 && (
          <span className="lang-flags" aria-label="Idiomas disponíveis">
            {breakdown.map((b) => (
              <span
                key={b.code}
                className="lang-flag-pct"
                title={`${langLabel(b.code)} · ${b.pct}% dos capítulos`}
              >
                <Flag lang={b.code} size={18} />
                {breakdown.length > 1 && <span className="lang-flag-pctnum">{b.pct}%</span>}
              </span>
            ))}
          </span>
        )}
      </>
    );
  }

  if (breakdown.length === 0) return null;
  return (
    <>
      <h3 className="section">Idiomas</h3>
      <ul className="lang-breakdown">
        {breakdown.map((b) => (
          <li key={b.code}>
            <Flag lang={b.code} size={20} title={langLabel(b.code)} />
            <span className="lang-name">{langLabel(b.code)}</span>
            <span className="lang-bar" aria-hidden="true">
              <span className="lang-bar-fill" style={{ width: `${b.pct}%` }} />
            </span>
            <span className="lang-pct">{b.pct}%</span>
            <span className="lang-count muted">
              {b.count} cap{b.count === 1 ? "." : "s."}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
