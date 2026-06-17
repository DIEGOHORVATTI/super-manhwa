"use client";
import type { MangaCharacter, MangaRelation } from "@packages/contracts";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, Suspense, useEffect, useState } from "react";
import { ChapterList } from "@/components/ChapterList";
import { ChapterLoadingNote } from "@/components/ChapterLoadingNote";
import { CharactersTab } from "@/components/CharactersTab";
import { Cover } from "@/components/Cover";
import { Icon } from "@/components/Icon";
import { ChaptersGridSkeleton } from "@/components/Skeleton";
import { useReadChapters } from "@/lib/library";
import { routes } from "@/lib/routes";

type Chapter = { id: string; name: string; lang?: string };
type ChaptersResult = { chapters: Chapter[]; lang: string };

/**
 * Owns the active-tab + filter state for the whole detail page. The header's
 * "…ver mais" jumps to "Sobre"; the search box on the right of the tab bar
 * filters the active tab live | chapters by name/number, characters by name |
 * and is disabled on "Sobre". Cover/genres/about/meta are server-rendered slots.
 *
 * Chapters are streamed: `chaptersPromise` is consumed (via `use()`) inside a
 * Suspense boundary by {@link ChapterList}, so the hero and tab bar paint
 * immediately while the cross-source chapter fan-out resolves behind a skeleton.
 */
const RELATION_LABELS: Record<string, string> = {
  SEQUEL: "Sequência",
  PREQUEL: "Prelúdio",
  SIDE_STORY: "História paralela",
  ALTERNATIVE: "Alternativo",
  ADAPTATION: "Adaptação",
  SPIN_OFF: "Spin-off",
  CHARACTER: "Personagem",
  SUMMARY: "Resumo",
  OTHER: "Relacionado",
};

type EnrichedRelation = MangaRelation & { id?: string; imageUrl?: string };

function RelatedWorks({ relations }: { relations: EnrichedRelation[] }) {
  if (relations.length === 0) return null;
  return (
    <section className="related-works">
      <h2 className="section">Obras relacionadas</h2>
      <div className="poster-grid">
        {relations.map((r, i) => {
          const href = r.id ? routes.manga(r.id, r.title) : `/?q=${encodeURIComponent(r.title)}`;
          const label = RELATION_LABELS[r.relation] ?? r.relation;
          return (
            <div key={`${r.relation}-${i}`} className="poster">
              <div className="poster-cover">
                <Cover src={r.imageUrl} alt={r.title} sizes="160px" />
                <span className="relation-badge">{label}</span>
                <Link className="poster-hit" href={href} aria-label={r.title} tabIndex={-1} />
              </div>
              <Link className="poster-name" href={href}>
                {r.title}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function DetailView({
  backdrop,
  cover,
  title,
  meta,
  genres,
  descPreview,
  mangaId,
  lang,
  chaptersPromise,
  charactersPromise,
  about,
  comments,
  relations,
}: {
  backdrop?: string;
  cover: ReactNode;
  title: string;
  meta: ReactNode;
  genres: ReactNode;
  descPreview?: string;
  mangaId: string;
  lang: string;
  chaptersPromise: Promise<ChaptersResult>;
  charactersPromise: Promise<MangaCharacter[]>;
  about: ReactNode;
  comments?: ReactNode;
  relations?: EnrichedRelation[];
}) {
  const [active, setActive] = useState<"chapters" | "characters" | "about" | "comments">(
    "chapters",
  );
  const [query, setQuery] = useState("");
  // Chapter sort order: false = newest first (source default), true = oldest first.
  const [sortAsc, setSortAsc] = useState(false);
  // Touch read-state so the hook subscribes the page even before the list
  // resolves (keeps client cache warm for ChapterList's first paint).
  useReadChapters(mangaId);

  // Always open a work at the top | navigating between obras (or back from the
  // reader) otherwise keeps the previous scroll position. Smooth so the jump
  // reads as a deliberate scroll, not a flash.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [mangaId]);

  const select = (key: typeof active) => {
    setActive(key);
    setQuery("");
  };

  const searchDisabled = active === "about" || active === "comments";
  const placeholder =
    active === "characters" ? "Buscar personagem…" : "Buscar capítulo por nome ou número…";

  const tabs: Array<{ key: typeof active; label: string }> = [
    { key: "chapters", label: "Capítulos" },
    { key: "characters", label: "Personagens" },
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

        <div className="tab-tools">
          {active === "chapters" && (
            <button
              type="button"
              className={`sort-btn${sortAsc ? " is-asc" : ""}`}
              onClick={() => setSortAsc((s) => !s)}
              title={sortAsc ? "Mais antigos primeiro" : "Mais recentes primeiro"}
              aria-label={
                sortAsc
                  ? "Ordenar capítulos: mais antigos primeiro"
                  : "Ordenar capítulos: mais recentes primeiro"
              }
            >
              <Icon name="arrow-down-up" size={15} />
            </button>
          )}
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
        </div>
      </nav>

      {/* Capítulos | streamed; suspends behind a grid skeleton until the
          cross-source fan-out resolves. */}
      <div hidden={active !== "chapters"}>
        <Suspense
          fallback={
            <>
              <ChapterLoadingNote />
              <ChaptersGridSkeleton />
            </>
          }
        >
          <ChapterList
            promise={chaptersPromise}
            query={query}
            mangaId={mangaId}
            title={title}
            lang={lang}
            sortAsc={sortAsc}
          />
        </Suspense>
      </div>

      {/* Personagens | streamed; suspends until the AniList lookup resolves. */}
      <div hidden={active !== "characters"}>
        <Suspense fallback={<p className="muted">Carregando personagens…</p>}>
          <CharactersTab promise={charactersPromise} query={query} />
        </Suspense>
      </div>

      {/* Sobre */}
      <div hidden={active !== "about"}>{about}</div>

      {/* Comentários | montados só quando a aba abre. */}
      {comments && (
        <div hidden={active !== "comments"}>{active === "comments" ? comments : null}</div>
      )}

      {relations && relations.length > 0 && <RelatedWorks relations={relations} />}
    </>
  );
}
