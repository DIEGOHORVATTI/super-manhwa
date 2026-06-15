"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { routes } from "@/lib/routes";

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
 * The Explorar filter bar. Source of truth is the URL | each control rewrites
 * the querystring (resetting to page 1) and lets the server re-render. The text
 * query submits on Enter so we don't navigate on every keystroke.
 */
export function ExploreFilters({
  genres,
  q,
  genre,
  status,
  sort,
  basePath = routes.home,
}: {
  genres: string[];
  q: string;
  genre: string;
  status: string;
  sort: string;
  /** Where filter changes navigate to | `/` now that explore is the home. */
  basePath?: string;
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
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  // Remove a single applied filter | rebuilt from the *applied* props (not the
  // in-progress text input), resetting page to 1.
  const removeFilter = (
    patch: Partial<{ q: string; genre: string; status: string; sort: string }>,
  ) => {
    const m = { q, genre, status, sort, ...patch };
    const params = new URLSearchParams();
    if (m.q.trim()) params.set("q", m.q.trim());
    if (m.genre) params.set("genre", m.genre);
    if (m.status) params.set("status", m.status);
    if (m.sort && m.sort !== "popular") params.set("sort", m.sort);
    if (patch.q === "") setQuery("");
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  // Applied filters as removable chips (popular sort is the default → no chip).
  const chips = [
    q ? { key: "q", label: `Busca: ${q}`, clear: () => removeFilter({ q: "" }) } : null,
    genre ? { key: "genre", label: genre, clear: () => removeFilter({ genre: "" }) } : null,
    status
      ? {
          key: "status",
          label: STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status,
          clear: () => removeFilter({ status: "" }),
        }
      : null,
    sort && sort !== "popular"
      ? {
          key: "sort",
          label: SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort,
          clear: () => removeFilter({ sort: "popular" }),
        }
      : null,
  ].filter((c): c is { key: string; label: string; clear: () => void } => c !== null);

  return (
    <>
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

      {chips.length > 0 && (
        <div className="active-filters">
          {chips.map((c) => (
            <button key={c.key} type="button" className="filter-chip" onClick={c.clear}>
              {c.label}
              <Icon name="x" size={13} />
            </button>
          ))}
          {chips.length > 1 && (
            <button
              type="button"
              className="filter-clear"
              onClick={() => {
                setQuery("");
                router.push(basePath);
              }}
            >
              Limpar tudo
            </button>
          )}
        </div>
      )}
    </>
  );
}
