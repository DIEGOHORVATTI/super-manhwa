"use client";

import type { NovelPage, NovelSummary } from "@/lib/catalog/types";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useState } from "react";

import { routes } from "@/lib/routes";

import { NovelCard } from "./NovelCard";

type NovelGridProps = {
  initial: NovelSummary[];
  hasNextPage: boolean;
  params?: Record<string, string>;
};

const COLUMNS = {
  xs: "repeat(2, minmax(0, 1fr))",
  sm: "repeat(4, minmax(0, 1fr))",
  md: "repeat(5, minmax(0, 1fr))",
  lg: "repeat(6, minmax(0, 1fr))",
};

export function NovelGrid({ initial, hasNextPage, params = {} }: NovelGridProps) {
  const [novels, setNovels] = useState(initial);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(hasNextPage);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ ...params, page: String(page + 1) });
      const response = await fetch(`${routes.api.list}?${query}`);
      const data = (await response.json()) as NovelPage;
      setNovels((current) => {
        const seen = new Set(current.map((novel) => novel.slug));
        return [...current, ...data.list.filter((novel) => !seen.has(novel.slug))];
      });
      setPage((current) => current + 1);
      setHasMore(data.hasNextPage);
    } finally {
      setLoading(false);
    }
  };

  if (novels.length === 0) {
    return (
      <Typography color="text.secondary">Nenhuma novel encontrada com esses filtros.</Typography>
    );
  }

  return (
    <>
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: COLUMNS }}>
        {novels.map((novel) => (
          <NovelCard key={novel.slug} novel={novel} />
        ))}
      </Box>
      {hasMore && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Button variant="outlined" color="inherit" onClick={loadMore} loading={loading}>
            Carregar mais
          </Button>
        </Box>
      )}
    </>
  );
}
