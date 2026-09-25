import type { BrowseState } from "./BrowseFilters";

import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { browseNovels, getGenres, searchNovels } from "@/lib/catalog";
import { toListParams } from "@/lib/catalog/browse-state";

import { BrowseFilters } from "./BrowseFilters";
import { ContinueReadingRail } from "./ContinueReadingRail";
import { NovelGrid } from "./NovelGrid";

type BrowseViewProps = {
  state: BrowseState;
  title?: string;
};

const EMPTY = { list: [], hasNextPage: false };

export async function BrowseView({ state, title }: BrowseViewProps) {
  const isSearching = state.q.length >= 2;
  const isLanding = !state.q && !state.genre && !state.status && state.sort === "popular";

  const [genres, result] = await Promise.all([
    getGenres().catch(() => []),
    (isSearching
      ? searchNovels(state.q)
      : browseNovels({
          sort: state.sort,
          genre: state.genre || undefined,
          status: state.status || undefined,
        })
    ).catch(() => EMPTY),
  ]);

  return (
    <Stack spacing={4}>
      {title && (
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
      )}

      <BrowseFilters genres={genres} state={state} />

      {isLanding && <ContinueReadingRail />}

      <Stack spacing={2}>
        <Typography variant="h5" component="h2">
          {isSearching ? `Resultados para “${state.q}”` : isLanding ? "Populares" : "Novels"}
        </Typography>
        {state.q.length === 1 ? (
          <Typography color="text.secondary">Digite ao menos 2 caracteres para buscar.</Typography>
        ) : (
          <NovelGrid
            key={JSON.stringify(state)}
            initial={result.list}
            hasNextPage={result.hasNextPage}
            params={toListParams(state)}
          />
        )}
      </Stack>
    </Stack>
  );
}
