"use client";

import type { ChapterSummary } from "@/lib/catalog/types";

import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";
import { useState } from "react";

import { chapterLabel } from "@/lib/catalog/labels";
import { useHistory, useReadChapters } from "@/lib/library";
import { routes } from "@/lib/routes";

type ChapterListProps = {
  novelSlug: string;
  novelTitle: string;
  chapters: ChapterSummary[];
};

const PAGE_SIZE = 100;
const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

export function ChapterList({ novelSlug, novelTitle, chapters }: ChapterListProps) {
  const [filter, setFilter] = useState("");
  const [oldestFirst, setOldestFirst] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const read = useReadChapters(novelSlug);
  const current = useHistory().find((entry) => entry.id === novelSlug)?.chapterId;

  const normalizedFilter = filter.trim().toLowerCase();
  const ordered = oldestFirst ? chapters.toReversed() : chapters;
  const filtered = ordered.filter((chapter) =>
    chapter.title.toLowerCase().includes(normalizedFilter),
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          fullWidth
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filtrar capítulos, ex.: volume 16"
        />
        <Tooltip title={oldestFirst ? "Mais recentes primeiro" : "Mais antigos primeiro"}>
          <IconButton onClick={() => setOldestFirst((value) => !value)} aria-label="Inverter ordem">
            <SwapVertRoundedIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <List disablePadding dense>
        {filtered.slice(0, visible).map((chapter) => {
          const isRead = read.has(chapter.slug);
          return (
            <ListItemButton
              key={chapter.slug}
              component={Link}
              href={routes.read(chapter.slug)}
              selected={chapter.slug === current}
              sx={{ borderRadius: 1, opacity: isRead ? 0.55 : 1 }}
            >
              <ListItemText
                primary={chapterLabel(chapter.title, novelTitle)}
                secondary={dateFormat.format(new Date(chapter.date))}
              />
              {isRead && <CheckRoundedIcon fontSize="small" color="success" aria-label="Lido" />}
            </ListItemButton>
          );
        })}
      </List>

      {filtered.length > visible && (
        <Button color="inherit" onClick={() => setVisible((count) => count + PAGE_SIZE)}>
          Mostrar mais ({filtered.length - visible})
        </Button>
      )}
    </Stack>
  );
}
