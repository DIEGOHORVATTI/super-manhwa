import type { MangaSort } from "@packages/contracts";
import { PosterGrid } from "@/components/PosterGrid";
import { api } from "@/lib/orpc.server";

export const dynamic = "force-dynamic";

const VALID_SORTS: ReadonlyArray<MangaSort> = ["popular", "newest", "completed"];

/**
 * Aggregated home — Brazilian-Portuguese only by design. The frontend doesn't
 * expose a language switcher; every catalog call hard-pins `lang=pt-br`. To
 * relax this later, expose a `LangFilter` and lift the constant.
 */
export default async function Home({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const sp = await searchParams;
  const sort: MangaSort = VALID_SORTS.includes(sp.sort as MangaSort)
    ? (sp.sort as MangaSort)
    : "popular";

  const popular = await api.manga.popular({ lang: "pt-br", sort, page: 1 });
  const label = sort === "popular" ? "Em alta" : sort === "newest" ? "Mais novos" : "Completos";

  return (
    <>
      <header className="home-head">
        <h1 className="home-title">{label}</h1>
        <span className="muted">{popular.list.length} obras</span>
      </header>

      <PosterGrid items={popular.list} />
    </>
  );
}
