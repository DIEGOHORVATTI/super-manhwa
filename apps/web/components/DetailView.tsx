"use client";
import { type ReactNode, useState } from "react";

type Tab = { key: string; label: string; content: ReactNode };

/**
 * Owns the active-tab state for the whole detail page so the header's
 * "…ver mais" link can jump straight to the "Sobre" tab. The cover, genres and
 * every tab body are server-rendered and passed in as slots — the client only
 * toggles which tab is visible (chapter Links / markdown stay RSC).
 *
 * The top is a scan-site style hero: a blurred backdrop (banner, or the cover
 * when there's no banner) under a gradient scrim, with the cover + title + meta
 * laid over it. Back navigation lives in the global app Header.
 */
export function DetailView({
  backdrop,
  cover,
  title,
  meta,
  genres,
  descPreview,
  aboutKey,
  tabs,
}: {
  backdrop?: string;
  cover: ReactNode;
  title: string;
  meta: ReactNode;
  genres: ReactNode;
  descPreview?: string;
  aboutKey: string;
  tabs: Tab[];
}) {
  const [active, setActive] = useState(tabs[0]?.key);

  return (
    <>
      <section className="detail-hero">
        {backdrop && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="detail-hero-bg" src={backdrop} alt="" aria-hidden="true" />
        )}
        <div className="detail-hero-scrim" />

        <div className="detail-hero-inner">
          {cover}
          <div className="detail-info">
            <h1 className="detail-title">{title}</h1>
            <div className="detail-meta">{meta}</div>
            {genres}
            {descPreview && (
              <p className="detail-desc-preview">
                {descPreview}{" "}
                <button type="button" className="ver-mais" onClick={() => setActive(aboutKey)}>
                  …ver mais
                </button>
              </p>
            )}
          </div>
        </div>
      </section>

      <nav className="detail-tabs" aria-label="Seções da obra">
        {tabs.map((t) => (
          <button
            type="button"
            key={t.key}
            className={`detail-tab${active === t.key ? " is-active" : ""}`}
            aria-current={active === t.key ? "true" : undefined}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {tabs.map((t) => (
        <div key={t.key} hidden={active !== t.key}>
          {t.content}
        </div>
      ))}
    </>
  );
}
