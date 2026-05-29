"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";

/** Status options that map to a real AniList filter (see backend ANILIST_STATUS). */
const STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "Qualquer status" },
  { value: "ongoing", label: "Em andamento" },
  { value: "completed", label: "Completo" },
  { value: "hiatus", label: "Hiato" },
  { value: "cancelled", label: "Cancelado" },
];

const SORT_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "popular", label: "Em alta" },
  { value: "trending", label: "Tendência" },
  { value: "newest", label: "Mais novos" },
];

/**
 * The Explorar filter bar. Source of truth is the URL — each control rewrites
 * the querystring (resetting to page 1) and lets the server re-render. The text
 * query submits on Enter so we don't navigate on every keystroke.
 */
export function ExploreFilters({
  genres,
  q,
  genre,
  status,
  sort,
}: {
  genres: string[];
  q: string;
  genre: string;
  status: string;
  sort: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(q);

  const go = (next: Partial<{ q: string; genre: string; status: string; sort: string }>) => {
    const params = new URLSearchParams();
    const merged = { q: query, genre, status, sort, ...next };
    if (merged.q.trim()) params.set("q", merged.q.trim());
    if (merged.genre) params.set("genre", merged.genre);
    if (merged.status) params.set("status", merged.status);
    if (merged.sort && merged.sort !== "popular") params.set("sort", merged.sort);
    const qs = params.toString();
    router.push(qs ? `/explorar?${qs}` : "/explorar");
  };

  return (
    <form
      className="explore-filters"
      onSubmit={(e) => {
        e.preventDefault();
        go({});
      }}
    >
      <div className="explore-search">
        <Icon className="explore-search-icon" name="search" size={16} />
        <input
          className="explore-search-field"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por título…"
          aria-label="Buscar por título"
          type="search"
        />
        {query && (
          <button
            type="button"
            className="explore-search-clear"
            aria-label="Limpar busca"
            onClick={() => {
              setQuery("");
              go({ q: "" });
            }}
          >
            <Icon name="x" size={14} />
          </button>
        )}
      </div>

      <select
        className="select explore-select"
        value={genre}
        aria-label="Gênero"
        onChange={(e) => go({ genre: e.target.value })}
      >
        <option value="">Todos os gêneros</option>
        {genres.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>

      <select
        className="select explore-select"
        value={status}
        aria-label="Status"
        onChange={(e) => go({ status: e.target.value })}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        className="select explore-select"
        value={sort}
        aria-label="Ordenar por"
        disabled={!!query.trim()}
        title={query.trim() ? "A ordenação não se aplica durante a busca por texto" : undefined}
        onChange={(e) => go({ sort: e.target.value })}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </form>
  );
}
