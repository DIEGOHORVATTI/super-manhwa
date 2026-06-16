import type { MangaSort, MangaStatus } from "@packages/contracts";
import type { Metadata } from "next";
import { ContinueReading } from "@/components/ContinueReading";
import { ExploreFilters } from "@/components/ExploreFilters";
import { InfiniteList } from "@/components/InfiniteList";
import { PosterRow } from "@/components/PosterRow";
import { api } from "@/lib/orpc.server";

const SHELF_SIZE = 15;

const SORTS: ReadonlyArray<MangaSort> = ["popular", "trending", "newest"];
const STATUSES: ReadonlyArray<MangaStatus> = ["ongoing", "completed", "hiatus", "cancelled"];

type SP = Promise<{ q?: string; genre?: string; status?: string; sort?: string; page?: string }>;

// Every filter/sort/page variant is the same landing content reshuffled, so they
// all canonicalize to "/" | keeping Google's index on one strong home URL.
export const metadata: Metadata = { alternates: { canonical: "/" } };

/**
 * Home | unified discovery (the landing page (formerly /explorar)). A text
 * query runs search; without one it browses by sort. Genre + status refine
 * either; all state lives in the URL so results are shareable. The landing state
 * (no filters) tops the page with the continue-reading rail, a Discord CTA and
 * trending/newest carousels above the popular grid.
 */
export default async function Home({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const genre = sp.genre ?? "";
  const status: MangaStatus | undefined = STATUSES.includes(sp.status as MangaStatus)
    ? (sp.status as MangaStatus)
    : undefined;
  const sort: MangaSort = SORTS.includes(sp.sort as MangaSort) ? (sp.sort as MangaSort) : "popular";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

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

  // Params for the infinite-scroll endpoint (no `page` | InfiniteList adds it).
  const listParams: Record<string, string> = { feed: "browse" };
  if (q) listParams.q = q;
  if (genre) listParams.genre = genre;
  if (status) listParams.status = status;
  if (sort !== "popular") listParams.sort = sort;

  return (
    <>
      <ExploreFilters
        genres={genresRes.genres}
        q={q}
        genre={genre}
        status={status ?? ""}
        sort={sort}
      />

      {isLanding && (
        <>
          {/* Continue reading now sits below the search/filters. */}
          <ContinueReading />
          <PosterRow
            title="Em tendência"
            icon="flame"
            items={trending.list.slice(0, SHELF_SIZE)}
            moreHref="/?sort=trending"
          />
          <PosterRow
            title="Mais novos"
            icon="calendar-plus"
            items={newest.list.slice(0, SHELF_SIZE)}
            moreHref="/?sort=newest"
          />
          <h2 className="section">Populares</h2>
        </>
      )}

      {q.length === 1 ? (
        <p className="muted">Digite ao menos 2 caracteres para buscar.</p>
      ) : result.list.length === 0 ? (
        <p className="muted">Nenhuma obra encontrada com esses filtros.</p>
      ) : (
        <InfiniteList
          initial={result.list}
          initialPage={page}
          hasNextPage={result.hasNextPage}
          params={listParams}
        />
      )}
    </>
  );
}
