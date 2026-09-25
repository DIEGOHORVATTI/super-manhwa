"use client";

import type { ChapterSummary } from "@/lib/catalog/types";

import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";

import { chapterLabel } from "@/lib/catalog/labels";

type ChapterNavigationProps = {
  novelTitle: string;
  previous?: ChapterSummary;
  next?: ChapterSummary;
  onNavigate: (chapter: ChapterSummary) => void;
};

export function ChapterNavigation({
  novelTitle,
  previous,
  next,
  onNavigate,
}: ChapterNavigationProps) {
  return (
    <Stack direction="row" spacing={2} justifyContent="space-between">
      <Button
        variant="outlined"
        color="inherit"
        disabled={!previous}
        startIcon={<ChevronLeftRoundedIcon />}
        onClick={() => previous && onNavigate(previous)}
        title={previous && chapterLabel(previous.title, novelTitle)}
      >
        Capítulo anterior
      </Button>
      <Button
        variant="contained"
        color="primary"
        disabled={!next}
        endIcon={<ChevronRightRoundedIcon />}
        onClick={() => next && onNavigate(next)}
        title={next && chapterLabel(next.title, novelTitle)}
      >
        Próximo capítulo
      </Button>
    </Stack>
  );
}
