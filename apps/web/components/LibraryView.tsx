"use client";

import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";

import { ContinueReadingRail } from "@/components/novel/ContinueReadingRail";
import { NovelCard } from "@/components/novel/NovelCard";
import { useFavorites } from "@/lib/library";
import { routes } from "@/lib/routes";

const COLUMNS = {
  xs: "repeat(2, minmax(0, 1fr))",
  sm: "repeat(4, minmax(0, 1fr))",
  md: "repeat(5, minmax(0, 1fr))",
  lg: "repeat(6, minmax(0, 1fr))",
};

/**
 * The local library screen | favorites grid + the continue-listening rail, both
 * sourced from localStorage (mirrored to the DB when signed in).
 */
export function LibraryView() {
  const favorites = useFavorites();

  return (
    <Stack spacing={4}>
      <ContinueReadingRail />

      <Stack spacing={2}>
        <Typography variant="h5" component="h2">
          Favoritas
        </Typography>
        {favorites.length === 0 ? (
          <Typography color="text.secondary">
            Nenhuma novel salva ainda. Toque no coração de uma obra para guardá-la aqui.{" "}
            <Link component={NextLink} href={routes.home}>
              Explorar o catálogo
            </Link>
            .
          </Typography>
        ) : (
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: COLUMNS }}>
            {favorites.map((favorite) => (
              <NovelCard
                key={favorite.id}
                novel={{
                  slug: favorite.id,
                  title: favorite.name,
                  cover: favorite.imageUrl,
                  genres: [],
                }}
              />
            ))}
          </Box>
        )}
      </Stack>
    </Stack>
  );
}
