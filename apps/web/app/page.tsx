import { api } from "@/lib/orpc.server";
import { Autocomplete } from "@/components/Autocomplete";
import { LangFilter } from "@/components/LangFilter";
import { PosterGrid } from "@/components/PosterGrid";
import { SortTabs } from "@/components/SortTabs";
import type { MangaSort } from "@packages/contracts";

export const dynamic = "force-dynamic";

const VALID_SORTS: ReadonlyArray<MangaSort> = ["popular", "newest", "completed"];

/**
 * Aggregated home — trending across every integration, deduped and source-less.
 * Sort/genre filters trigger backend enrichment (parallel detail fan-out); the
 * default sort is the raw, fast aggregation.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const lang = sp.lang ?? "";
  const sort: MangaSort = VALID_SORTS.includes(sp.sort as MangaSort)
    ? (sp.sort as MangaSort)
    : "popular";

  const [{ langs }, popular] = await Promise.all([
    api.manga.langs({}).catch(() => ({ langs: [] as string[] })),
    api.manga.popular({ lang: lang || undefined, sort, page: 1 }).catch((e) => ({
      list: [] as Awaited<ReturnType<typeof api.manga.popular>>["list"],
      hasNextPage: false,
      _error: e instanceof Error ? e.message : String(e),
    })),
  ]);
  const error = "_error" in popular ? popular._error : null;

  return (
    <>
      <div className="toolbar">
        <Autocomplete lang={lang} />
        <LangFilter langs={langs} lang={lang} />
      </div>

      <SortTabs active={sort} lang={lang} />

      <p className="muted" style={{ marginTop: 12 }}>
        {sort === "popular" ? "Em alta" : sort === "newest" ? "Mais novos" : "Completos"} ·{" "}
        {popular.list.length} obras
      </p>
      {error && <p className="notice">{error}</p>}

      <PosterGrid items={popular.list} />
    </>
  );
}
