import type { MangaSort, MangaStatus } from "@packages/contracts";
import type { Metadata } from "next";
import { ExploreFilters } from "@/components/ExploreFilters";
import { Pagination } from "@/components/Pagination";
import { PosterGrid } from "@/components/PosterGrid";
import { PosterRow } from "@/components/PosterRow";
import { api } from "@/lib/orpc.server";

const SHELF_SIZE = 15;

export const metadata: Metadata = {
  title: "Explorar — Super Manhwa",
  description: "Busque e filtre o catálogo por gênero, status e ordenação.",
};

const SORTS: ReadonlyArray<MangaSort> = ["popular", "trending", "newest"];
const STATUSES: ReadonlyArray<MangaStatus> = ["ongoing", "completed", "hiatus", "cancelled"];

type SP = Promise<{ q?: string; genre?: string; status?: string; sort?: string; page?: string }>;

/**
 * Unified discovery page (replaces the old "Completos" tab). A text query runs
 * search; without one it browses by sort. Genre + status refine either. All
 * state lives in the URL so results are shareable and the back button works.
 */
export default async function ExplorarPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const genre = sp.genre ?? "";
  const status: MangaStatus | undefined = STATUSES.includes(sp.status as MangaStatus)
    ? (sp.status as MangaStatus)
    : undefined;
  const sort: MangaSort = SORTS.includes(sp.sort as MangaSort) ? (sp.sort as MangaSort) : "popular";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  // Landing = no query, no filters, default sort, first page → show the
  // trending/newest discovery carousels above the popular grid. Any refinement
  // collapses to a plain paginated grid.
  const isLanding = q === "" && !genre && !status && sort === "popular" && page === 1;

  const searching = q.length >= 2;
  const [genresRes, result, trending, newest] = await Promise.all([
    api.manga.genres({ lang: "pt-br" }).catch(() => ({ genres: [] })),
    (searching
      ? api.manga.search({ lang: "pt-br", q, genre: genre || undefined, status, page })
      : api.manga.popular({ lang: "pt-br", genre: genre || undefined, status, sort, page })
    ).catch(() => ({ list: [], hasNextPage: false })),
    isLanding
      ? api.manga.popular({ lang: "pt-br", sort: "trending", page: 1 }).catch(() => ({ list: [] }))
      : Promise.resolve({ list: [] }),
    isLanding
      ? api.manga.popular({ lang: "pt-br", sort: "newest", page: 1 }).catch(() => ({ list: [] }))
      : Promise.resolve({ list: [] }),
  ]);

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (genre) params.set("genre", genre);
    if (status) params.set("status", status);
    if (sort !== "popular") params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/explorar?${qs}` : "/explorar";
  };

  return (
    <>
      <h1 className="home-title" style={{ marginBottom: 12 }}>
        Explorar
      </h1>

      <ExploreFilters
        genres={genresRes.genres}
        q={q}
        genre={genre}
        status={status ?? ""}
        sort={sort}
      />

      {isLanding && (
        <>
          <PosterRow
            title="Em tendência"
            icon="flame"
            items={trending.list.slice(0, SHELF_SIZE)}
            moreHref="/explorar?sort=trending"
          />
          <PosterRow
            title="Mais novos"
            icon="calendar-plus"
            items={newest.list.slice(0, SHELF_SIZE)}
            moreHref="/explorar?sort=newest"
          />
          <h2 className="section">Populares</h2>
        </>
      )}

      {q.length === 1 ? (
        <p className="muted">Digite ao menos 2 caracteres para buscar.</p>
      ) : result.list.length === 0 ? (
        <p className="muted">Nenhuma obra encontrada com esses filtros.</p>
      ) : (
        <>
          <PosterGrid items={result.list} />
          <Pagination page={page} hasNextPage={result.hasNextPage} buildHref={buildHref} />
        </>
      )}
    </>
  );
}
