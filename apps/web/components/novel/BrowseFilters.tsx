"use client";

import type { Genre, NovelSort, NovelStatus } from "@/lib/catalog/types";

import Stack from "@mui/material/Stack";
import { useRouter } from "next/navigation";

import { SelectAutocomplete } from "@/components/mui/SelectAutocomplete";
import { routes } from "@/lib/routes";

export type BrowseState = {
  q: string;
  genre: string;
  status: NovelStatus | "";
  sort: NovelSort;
};

type BrowseFiltersProps = {
  genres: Genre[];
  state: BrowseState;
};

const SORT_OPTIONS: { value: NovelSort; label: string }[] = [
  { value: "popular", label: "Populares" },
  { value: "update", label: "Atualizadas" },
  { value: "latest", label: "Novas" },
  { value: "rating", label: "Mais bem avaliadas" },
  { value: "title", label: "A-Z" },
];

const STATUS_OPTIONS: { value: NovelStatus | ""; label: string }[] = [
  { value: "", label: "Todos os status" },
  { value: "ongoing", label: "Em andamento" },
  { value: "completed", label: "Completas" },
  { value: "hiatus", label: "Em hiato" },
];

export function BrowseFilters({ genres, state }: BrowseFiltersProps) {
  const router = useRouter();

  const apply = (patch: Partial<BrowseState>) => {
    const next = { ...state, ...patch };
    router.push(
      routes.browse({
        q: next.q || null,
        genre: next.genre || null,
        status: next.status || null,
        sort: next.sort === "popular" ? null : next.sort,
      }),
    );
  };

  const genreOptions = [{ value: "", label: "Todos os gêneros" }].concat(
    genres.map((genre) => ({ value: genre.slug, label: genre.name })),
  );

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
      <SelectAutocomplete
        label="Gênero"
        value={state.genre}
        options={genreOptions}
        onChange={(genre) => apply({ genre })}
        sx={{ flex: 1 }}
      />
      <SelectAutocomplete
        label="Status"
        value={state.status}
        options={STATUS_OPTIONS}
        onChange={(status) => apply({ status })}
        sx={{ flex: 1 }}
      />
      <SelectAutocomplete
        label="Ordenar"
        value={state.sort}
        options={SORT_OPTIONS}
        onChange={(sort) => apply({ sort })}
        sx={{ flex: 1 }}
      />
    </Stack>
  );
}
