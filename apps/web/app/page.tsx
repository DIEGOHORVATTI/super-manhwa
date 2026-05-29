import { ContinueReading } from "@/components/ContinueReading";
import { Pagination } from "@/components/Pagination";
import { PosterGrid } from "@/components/PosterGrid";
import { RankingList } from "@/components/RankingList";
import { api } from "@/lib/orpc.server";

/**
 * Home — the curated landing: continue-reading rail, the popular grid (paginated)
 * and a trending ranking rail. Discovery by sort (trending/newest) and search now
 * live on /explorar, so the home is just "what's popular" + your own shelf.
 * Brazilian-Portuguese only by design (every catalog call hard-pins lang=pt-br).
 */
export default async function Home({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const [listing, ranking] = await Promise.all([
    api.manga.popular({ lang: "pt-br", sort: "popular", page }),
    api.manga.popular({ lang: "pt-br", sort: "trending", page: 1 }),
  ]);

  const buildHref = (p: number) => (p > 1 ? `/?page=${p}` : "/");

  return (
    <>
      <ContinueReading />

      <div className="home-layout">
        <div className="home-main">
          <PosterGrid items={listing.list} />
          <Pagination page={page} hasNextPage={listing.hasNextPage} buildHref={buildHref} />
        </div>

        <RankingList items={ranking.list.slice(0, 10)} title="Em tendência" icon="flame" />
      </div>
    </>
  );
}
