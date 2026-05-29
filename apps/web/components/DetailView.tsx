"use client";
import type { MangaCharacter } from "@packages/contracts";
import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import { CharacterGrid } from "@/components/CharacterGrid";

type Chapter = { id: string; name: string };

/** Accent/diacritic-insensitive haystack for the in-tab filter. */
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Owns the active-tab + filter state for the whole detail page. The header's
 * "…ver mais" jumps to "Sobre"; the search box on the right of the tab bar
 * filters the active tab live — chapters by name/number, characters by name —
 * and is disabled on "Sobre". Cover/genres/about are server-rendered slots;
 * chapter & character lists render here so the filter can re-render them.
 */
export function DetailView({
  backdrop,
  cover,
  title,
  meta,
  genres,
  descPreview,
  mangaId,
  chapters,
  characters,
  about,
}: {
  backdrop?: string;
  cover: ReactNode;
  title: string;
  meta: ReactNode;
  genres: ReactNode;
  descPreview?: string;
  mangaId: string;
  chapters: Chapter[];
  characters: MangaCharacter[];
  about: ReactNode;
}) {
  const hasChars = characters.length > 0;
  const [active, setActive] = useState<"chapters" | "characters" | "about">("chapters");
  const [query, setQuery] = useState("");

  const q = norm(query.trim());
  const shownChapters = useMemo(
    () => (q ? chapters.filter((c) => norm(c.name).includes(q)) : chapters),
    [q, chapters],
  );
  const shownChars = useMemo(
    () => (q ? characters.filter((c) => norm(c.name).includes(q)) : characters),
    [q, characters],
  );

  const select = (key: typeof active) => {
    setActive(key);
    setQuery("");
  };

  const searchDisabled = active === "about";
  const placeholder =
    active === "characters" ? "Buscar personagem…" : "Buscar capítulo por nome ou número…";

  const tabs: Array<{ key: typeof active; label: string }> = [
    { key: "chapters", label: `Capítulos (${chapters.length})` },
    ...(hasChars ? [{ key: "characters" as const, label: "Personagens" }] : []),
    { key: "about", label: "Sobre" },
  ];

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
                <button type="button" className="ver-mais" onClick={() => select("about")}>
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
            onClick={() => select(t.key)}
          >
            {t.label}
          </button>
        ))}

        <div className="tab-search">
          <svg
            className="tab-search-icon"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            className="tab-search-field"
            value={searchDisabled ? "" : query}
            placeholder={placeholder}
            disabled={searchDisabled}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={placeholder}
          />
        </div>
      </nav>

      {/* Capítulos */}
      <div hidden={active !== "chapters"}>
        {shownChapters.length === 0 ? (
          <p className="muted">
            {chapters.length === 0 ? "Nenhum capítulo disponível." : "Nenhum capítulo encontrado."}
          </p>
        ) : (
          <ul className="chapters-grid">
            {shownChapters.map((c) => (
              <li key={c.id}>
                <Link
                  className="chip"
                  href={`/read/${c.id}?m=${mangaId}&mn=${encodeURIComponent(title)}&n=${encodeURIComponent(c.name)}`}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Personagens */}
      {hasChars && (
        <div hidden={active !== "characters"}>
          {shownChars.length === 0 ? (
            <p className="muted">Nenhum personagem encontrado.</p>
          ) : (
            <CharacterGrid characters={shownChars} />
          )}
        </div>
      )}

      {/* Sobre */}
      <div hidden={active !== "about"}>{about}</div>
    </>
  );
}
