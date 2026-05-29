"use client";
import type { MangaCharacter } from "@packages/contracts";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import { CharacterGrid } from "@/components/CharacterGrid";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icon";
import { useReadChapters } from "@/lib/library";

type Chapter = { id: string; name: string; lang?: string };

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
  lang,
  chapters,
  characters,
  about,
  comments,
}: {
  backdrop?: string;
  cover: ReactNode;
  title: string;
  meta: ReactNode;
  genres: ReactNode;
  descPreview?: string;
  mangaId: string;
  lang: string;
  chapters: Chapter[];
  characters: MangaCharacter[];
  about: ReactNode;
  comments?: ReactNode;
}) {
  const hasChars = characters.length > 0;
  const [active, setActive] = useState<"chapters" | "characters" | "about" | "comments">(
    "chapters",
  );
  const [query, setQuery] = useState("");
  const read = useReadChapters(mangaId);

  // Chapter names have no consistent format across sources, so we don't show
  // them. Number each chapter by its position instead — sources return chapters
  // newest-first, so the top of the list gets the highest number.
  const chapterNo = useMemo(() => {
    const m = new Map<string, number>();
    chapters.forEach((c, i) => m.set(c.id, chapters.length - i));
    return m;
  }, [chapters]);

  const q = norm(query.trim());
  const shownChapters = useMemo(
    () =>
      q
        ? chapters.filter(
            (c) => norm(c.name).includes(q) || String(chapterNo.get(c.id) ?? "").includes(q),
          )
        : chapters,
    [q, chapters, chapterNo],
  );
  const shownChars = useMemo(
    () => (q ? characters.filter((c) => norm(c.name).includes(q)) : characters),
    [q, characters],
  );

  const select = (key: typeof active) => {
    setActive(key);
    setQuery("");
  };

  const searchDisabled = active === "about" || active === "comments";
  const placeholder =
    active === "characters" ? "Buscar personagem…" : "Buscar capítulo por nome ou número…";

  const tabs: Array<{ key: typeof active; label: string }> = [
    { key: "chapters", label: `Capítulos (${chapters.length})` },
    ...(hasChars ? [{ key: "characters" as const, label: "Personagens" }] : []),
    { key: "about", label: "Sobre" },
    ...(comments ? [{ key: "comments" as const, label: "Comentários" }] : []),
  ];

  return (
    <>
      <section className="detail-hero">
        {backdrop && (
          <Image
            className="detail-hero-bg"
            src={backdrop}
            alt=""
            aria-hidden="true"
            fill
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
        )}
        <div className="detail-hero-scrim" />

        <div className="detail-hero-inner">
          {cover}
          <div className="detail-info">
            <h1 className="detail-title">{title}</h1>
            {meta}
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
          <Icon className="tab-search-icon" name="search" size={15} />
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
                  className={`chip${read.has(c.id) ? " is-read" : ""}`}
                  href={`/read/${c.id}?m=${mangaId}&mn=${encodeURIComponent(title)}&n=${encodeURIComponent(c.name)}`}
                  title={read.has(c.id) ? "Lido" : undefined}
                >
                  <Flag
                    lang={c.lang ?? lang}
                    size={16}
                    title={c.lang ?? lang}
                    className="chip-flag"
                  />
                  <span className="chip-no">Cap. {chapterNo.get(c.id)}</span>
                  {read.has(c.id) && (
                    <span className="chip-read" aria-label="Lido">
                      <Icon name="circle-check-big" size={12} />
                    </span>
                  )}
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

      {/* Comentários — mounted only when open so Disqus doesn't load otherwise. */}
      {comments && (
        <div hidden={active !== "comments"}>{active === "comments" ? comments : null}</div>
      )}
    </>
  );
}
