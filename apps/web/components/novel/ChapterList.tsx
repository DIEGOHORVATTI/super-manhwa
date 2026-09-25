"use client";

import type { ChapterItem } from "@/lib/catalog/chapter-groups";
import type { ChapterSummary } from "@/lib/catalog/types";

import AutoStoriesRoundedIcon from "@mui/icons-material/AutoStoriesRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { varAlpha } from "minimal-shared/utils";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { groupChapters } from "@/lib/catalog/chapter-groups";
import { useHistory, useReadChapters } from "@/lib/library";
import { routes } from "@/lib/routes";

type ChapterListProps = {
  novelSlug: string;
  novelTitle: string;
  chapters: ChapterSummary[];
};

type ChapterRowProps = {
  chapter: ChapterItem;
  isRead: boolean;
  isCurrent: boolean;
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

function ChapterRow({ chapter, isRead, isCurrent }: ChapterRowProps) {
  return (
    <ButtonBase
      component={Link}
      href={routes.read(chapter.slug)}
      sx={(theme) => ({
        gap: 1.5,
        p: 1.25,
        width: "100%",
        borderRadius: 1.5,
        justifyContent: "flex-start",
        textAlign: "left",
        border: `1px solid ${isCurrent ? theme.vars.palette.primary.main : theme.vars.palette.divider}`,
        bgcolor: isCurrent ? varAlpha(theme.vars.palette.primary.mainChannel, 0.08) : "transparent",
        transition: theme.transitions.create(["background-color", "border-color"]),
        "&:hover": {
          bgcolor: varAlpha(theme.vars.palette.grey["500Channel"], 0.08),
          borderColor: isCurrent
            ? theme.vars.palette.primary.main
            : theme.vars.palette.text.disabled,
        },
      })}
    >
      <Box
        sx={(theme) => ({
          width: 44,
          height: 44,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          borderRadius: 1.25,
          typography: "subtitle2",
          ...(isCurrent
            ? { bgcolor: "primary.main", color: "primary.contrastText" }
            : isRead
              ? {
                  bgcolor: varAlpha(theme.vars.palette.success.mainChannel, 0.16),
                  color: "success.light",
                }
              : {
                  bgcolor: varAlpha(theme.vars.palette.grey["500Channel"], 0.16),
                  color: "text.primary",
                }),
        })}
      >
        {chapter.number ?? <AutoStoriesRoundedIcon fontSize="small" />}
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="subtitle2"
          noWrap
          color={isRead && !isCurrent ? "text.secondary" : "text.primary"}
        >
          {chapter.name}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {dateFormat.format(new Date(chapter.date))}
        </Typography>
      </Box>

      {isCurrent ? (
        <Chip label="Continuar" size="small" color="primary" />
      ) : (
        isRead && <CheckCircleRoundedIcon fontSize="small" color="success" aria-label="Lido" />
      )}
    </ButtonBase>
  );
}

export function ChapterList({ novelSlug, novelTitle, chapters }: ChapterListProps) {
  const [filter, setFilter] = useState("");
  const [oldestFirst, setOldestFirst] = useState(false);
  const read = useReadChapters(novelSlug);
  const current = useHistory().find((entry) => entry.id === novelSlug)?.chapterId;

  const groups = useMemo(() => groupChapters(chapters, novelTitle), [chapters, novelTitle]);
  const currentGroup = groups.find((group) => group.chapters.some((c) => c.slug === current));
  const [expanded, setExpanded] = useState(() => new Set([groups[0]?.key].filter(Boolean)));
  const currentKey = currentGroup?.key;

  useEffect(() => {
    if (currentKey) setExpanded((keys) => new Set(keys).add(currentKey));
  }, [currentKey]);

  const query = filter.trim().toLowerCase();
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      chapters: query
        ? group.chapters.filter((chapter) =>
            `${group.title} ${chapter.name}`.toLowerCase().includes(query),
          )
        : group.chapters,
    }))
    .filter((group) => group.chapters.length > 0);
  const orderedGroups = oldestFirst
    ? visibleGroups
        .toReversed()
        .map((group) => ({ ...group, chapters: group.chapters.toReversed() }))
    : visibleGroups;

  const toggle = (key: string) =>
    setExpanded((keys) => {
      const next = new Set(keys);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
      >
        <Typography variant="h5" component="h2">
          Capítulos{" "}
          <Typography component="span" variant="h5" color="text.disabled">
            {chapters.length}
          </Typography>
        </Typography>

        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Buscar capítulo"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ width: { xs: "100%", sm: 240 } }}
          />
          <Button
            color="inherit"
            variant="outlined"
            startIcon={<SwapVertRoundedIcon />}
            onClick={() => setOldestFirst((value) => !value)}
            sx={{ flexShrink: 0 }}
          >
            {oldestFirst ? "Mais antigos" : "Mais recentes"}
          </Button>
        </Stack>
      </Stack>

      {orderedGroups.length === 0 && (
        <Typography color="text.secondary">Nenhum capítulo encontrado.</Typography>
      )}

      <Stack spacing={1.5}>
        {orderedGroups.map((group) => {
          const readCount = group.chapters.filter((chapter) => read.has(chapter.slug)).length;
          const isCurrentGroup = group.key === currentGroup?.key;

          return (
            <Accordion
              key={group.key}
              expanded={Boolean(query) || expanded.has(group.key)}
              onChange={() => toggle(group.key)}
              slotProps={{ transition: { unmountOnExit: true } }}
              sx={(theme) => ({
                ...theme.mixins.paperStyles(theme),
                borderRadius: 2,
                border: `1px solid ${theme.vars.palette.divider}`,
                boxShadow: "none",
                "&::before": { display: "none" },
              })}
            >
              <AccordionSummary>
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  useFlexGap
                  sx={{ flex: 1, flexWrap: "wrap", pr: 1 }}
                >
                  <Typography variant="subtitle1">{group.title}</Typography>
                  <Typography variant="body2" color="text.disabled">
                    {group.chapters.length} {group.chapters.length === 1 ? "capítulo" : "capítulos"}
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  {isCurrentGroup && (
                    <Chip label="Você está aqui" size="small" color="primary" variant="soft" />
                  )}
                  {readCount > 0 && (
                    <Chip
                      label={`${readCount}/${group.chapters.length} lidos`}
                      size="small"
                      color={readCount === group.chapters.length ? "success" : "default"}
                      variant="soft"
                    />
                  )}
                </Stack>
              </AccordionSummary>

              <AccordionDetails>
                <Box
                  sx={{
                    display: "grid",
                    gap: 1,
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                  }}
                >
                  {group.chapters.map((chapter) => (
                    <ChapterRow
                      key={chapter.slug}
                      chapter={chapter}
                      isRead={read.has(chapter.slug)}
                      isCurrent={chapter.slug === current}
                    />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>
    </Stack>
  );
}
