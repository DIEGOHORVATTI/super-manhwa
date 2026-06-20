"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Select } from "@/components/Select";
import { routes } from "@/lib/routes";

/** Status options that map to a real AniList filter (see backend ANILIST_STATUS). */
const STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "Status" },
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

const FORMAT_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "Formato" },
  { value: "manga", label: "Mangás" },
  { value: "novel", label: "Novels" },
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
  format,
  basePath = routes.home,
}: {
  genres: string[];
  q: string;
  genre: string;
  status: string;
  sort: string;
  format: string;
  /** Where filter changes navigate to | `/` now that explore is the home. */
  basePath?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(q);

  type FilterState = { q: string; genre: string; status: string; sort: string; format: string };

  const pushFrom = (m: FilterState) => {
    const params = new URLSearchParams();
    if (m.q.trim()) params.set("q", m.q.trim());
    if (m.genre) params.set("genre", m.genre);
    if (m.status) params.set("status", m.status);
    if (m.sort && m.sort !== "popular") params.set("sort", m.sort);
    if (m.format) params.set("format", m.format);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  const go = (next: Partial<FilterState>) =>
    pushFrom({ q: query, genre, status, sort, format, ...next });

  // Remove a single applied filter | rebuilt from the *applied* props (not the
  // in-progress text input), resetting page to 1.
  const removeFilter = (patch: Partial<FilterState>) => {
    if (patch.q === "") setQuery("");
    pushFrom({ q, genre, status, sort, format, ...patch });
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
    format
      ? {
          key: "format",
          label: FORMAT_OPTIONS.find((o) => o.value === format)?.label ?? format,
          clear: () => removeFilter({ format: "" }),
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
            placeholder="Buscar"
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

        <Select
          aria-label="Gênero"
          value={genre}
          onChange={(v) => go({ genre: v })}
          options={[
            { value: "", label: "Gêneros" },
            ...genres.map((g) => ({ value: g, label: g })),
          ]}
          className="explore-select"
        />

        <Select
          aria-label="Status"
          value={status}
          onChange={(v) => go({ status: v })}
          options={STATUS_OPTIONS as { value: string; label: string }[]}
          className="explore-select"
        />

        <Select
          aria-label="Formato"
          value={format}
          onChange={(v) => go({ format: v })}
          options={FORMAT_OPTIONS as { value: string; label: string }[]}
          disabled={!!query.trim()}
          className="explore-select"
        />

        <Select
          aria-label="Ordenar por"
          value={sort}
          onChange={(v) => go({ sort: v })}
          options={SORT_OPTIONS as { value: string; label: string }[]}
          disabled={!!query.trim()}
          className="explore-select"
        />
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
