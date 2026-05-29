import type { MangaSort } from "@packages/contracts";
import { Pagination } from "@/components/Pagination";
import { PosterGrid } from "@/components/PosterGrid";
import { RankingList } from "@/components/RankingList";
import { api } from "@/lib/orpc.server";

export const dynamic = "force-dynamic";

const VALID_SORTS: ReadonlyArray<MangaSort> = ["popular", "trending", "newest", "completed"];

/**
 * Aggregated home — Brazilian-Portuguese only by design. The frontend doesn't
 * expose a language switcher; every catalog call hard-pins `lang=pt-br`. To
 * relax this later, expose a `LangFilter` and lift the constant.
 *
 * Layout (Asura-inspired, kept lean): a paginated main grid for the active
 * sort + a numbered "trending now" ranking rail beside it.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const sort: MangaSort = VALID_SORTS.includes(sp.sort as MangaSort)
    ? (sp.sort as MangaSort)
    : "popular";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  // Main listing for the active sort/page + the ranking rail (always "trending",
  // so it stays a distinct "what's hot now" list regardless of the active tab).
  const [listing, ranking] = await Promise.all([
    api.manga.popular({ lang: "pt-br", sort, page }),
    api.manga.popular({ lang: "pt-br", sort: "trending", page: 1 }),
  ]);

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (sort !== "popular") params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <>
      <div className="home-layout">
        <div className="home-main">
          <PosterGrid items={listing.list} />
          <Pagination page={page} hasNextPage={listing.hasNextPage} buildHref={buildHref} />
        </div>

        <RankingList items={ranking.list.slice(0, 10)} title="Em tendência" />
      </div>
    </>
  );
}
