"use client";

import type { NovelSummary } from "@/lib/catalog/types";

import StarRoundedIcon from "@mui/icons-material/StarRounded";
import Box from "@mui/material/Box";
import CardActionArea from "@mui/material/CardActionArea";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import { routes } from "@/lib/routes";

import { FavoriteToggle } from "./FavoriteToggle";
import { NovelCover } from "./NovelCover";

type NovelCardProps = {
  novel: NovelSummary;
};

export function NovelCard({ novel }: NovelCardProps) {
  return (
    <Box sx={{ position: "relative" }}>
      <CardActionArea
        component={Link}
        href={routes.novel(novel.slug)}
        sx={{ borderRadius: 1.5, p: 0.5 }}
      >
        <NovelCover src={novel.cover} title={novel.title} />
        <Stack spacing={0.25} sx={{ pt: 1, px: 0.5 }}>
          <Typography variant="subtitle2" sx={{ lineHeight: 1.3 }} noWrap title={novel.title}>
            {novel.title}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {novel.rating !== undefined && (
              <Typography
                variant="caption"
                color="warning.main"
                sx={{ display: "flex", alignItems: "center", gap: 0.25 }}
              >
                <StarRoundedIcon sx={{ fontSize: 14 }} /> {novel.rating}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" noWrap>
              {novel.latestChapter ?? novel.genres.slice(0, 2).join(" · ")}
            </Typography>
          </Stack>
        </Stack>
      </CardActionArea>
      <Box sx={{ position: "absolute", top: 12, right: 12 }}>
        <FavoriteToggle slug={novel.slug} title={novel.title} cover={novel.cover} compact />
      </Box>
    </Box>
  );
}
