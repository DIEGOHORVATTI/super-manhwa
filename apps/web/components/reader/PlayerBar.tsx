"use client";

import type { PlayerState } from "@/lib/player/speech-player";

import { varAlpha } from "minimal-shared/utils";
import { useEffect } from "react";

import Fab from "@mui/material/Fab";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Slider from "@mui/material/Slider";
import Tooltip from "@mui/material/Tooltip";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import FastRewindRoundedIcon from "@mui/icons-material/FastRewindRounded";
import FastForwardRoundedIcon from "@mui/icons-material/FastForwardRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import SkipPreviousRoundedIcon from "@mui/icons-material/SkipPreviousRounded";
import RecordVoiceOverRoundedIcon from "@mui/icons-material/RecordVoiceOverRounded";

import { SelectAutocomplete } from "@/components/mui/SelectAutocomplete";

import { RATE_OPTIONS } from "@/lib/player/use-reader-settings";

type PlayerBarProps = {
  state: PlayerState;
  totalParagraphs: number;
  rate: number;
  onChangeRate: (rate: number) => void;
  hasPrevious: boolean;
  hasNext: boolean;
  onToggle: () => void;
  onSkip: (offset: 1 | -1) => void;
  onSeek: (paragraph: number) => void;
  onPreviousChapter: () => void;
  onNextChapter: () => void;
  onOpenVoices: () => void;
  onOpenSettings: () => void;
  hidden: boolean;
  onHiddenChange: (hidden: boolean) => void;
};

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement && target.closest('input, textarea, select, [role="slider"]')
  );
}

function usePlayerShortcuts(onToggle: () => void, onSkip: (offset: 1 | -1) => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target) || document.querySelector('[role="dialog"]')) return;
      const actions: Record<string, () => void> = {
        Space: onToggle,
        ArrowRight: () => onSkip(1),
        ArrowLeft: () => onSkip(-1),
      };
      const action = actions[event.code];
      if (!action) return;
      event.preventDefault();
      action();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggle, onSkip]);
}

export function PlayerBar({
  state,
  totalParagraphs,
  rate,
  onChangeRate,
  hasPrevious,
  hasNext,
  onToggle,
  onSkip,
  onSeek,
  onPreviousChapter,
  onNextChapter,
  onOpenVoices,
  onOpenSettings,
  hidden,
  onHiddenChange,
}: PlayerBarProps) {
  usePlayerShortcuts(onToggle, onSkip);
  const isPlaying = state.status === "playing";

  if (hidden) {
    return (
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={(theme) => ({
          position: "fixed",
          right: 24,
          bottom: 24,
          zIndex: theme.zIndex.appBar,
          p: 0.75,
          borderRadius: 99,
          bgcolor: varAlpha(theme.vars.palette.background.defaultChannel, 0.9),
          backdropFilter: "blur(14px)",
          boxShadow: theme.vars.customShadows.z16,
        })}
      >
        <Fab
          color="primary"
          size="medium"
          onClick={onToggle}
          aria-label={isPlaying ? "Pausar" : "Ouvir"}
        >
          {isPlaying ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
        </Fab>
        <Tooltip title="Mostrar player">
          <IconButton onClick={() => onHiddenChange(false)} aria-label="Mostrar player">
            <KeyboardArrowUpRoundedIcon />
          </IconButton>
        </Tooltip>
      </Stack>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={(theme) => ({
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        zIndex: theme.zIndex.appBar,
        borderRadius: 0,
        boxShadow: "none",
        backgroundImage: "none",
        bgcolor: varAlpha(theme.vars.palette.background.defaultChannel, 0.94),
        backdropFilter: "blur(14px)",
      })}
    >
      <Container maxWidth="md" sx={{ py: 1 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 56 }}>
            {state.paragraph + 1} / {totalParagraphs}
          </Typography>
          <Slider
            size="small"
            value={state.paragraph}
            min={0}
            max={Math.max(totalParagraphs - 1, 0)}
            onChange={(_, value) => onSeek(value as number)}
            aria-label="Parágrafo atual"
          />
        </Stack>

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <SelectAutocomplete
            value={rate}
            options={RATE_OPTIONS}
            onChange={onChangeRate}
            sx={{ width: 150 }}
          />

          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Tooltip title="Capítulo anterior">
              <span>
                <IconButton disabled={!hasPrevious} onClick={onPreviousChapter}>
                  <SkipPreviousRoundedIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Parágrafo anterior (←)">
              <IconButton onClick={() => onSkip(-1)}>
                <FastRewindRoundedIcon />
              </IconButton>
            </Tooltip>
            <Fab
              color="primary"
              size="medium"
              onClick={onToggle}
              aria-label={isPlaying ? "Pausar" : "Ouvir"}
            >
              {isPlaying ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
            </Fab>
            <Tooltip title="Próximo parágrafo (→)">
              <IconButton onClick={() => onSkip(1)}>
                <FastForwardRoundedIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Próximo capítulo">
              <span>
                <IconButton disabled={!hasNext} onClick={onNextChapter}>
                  <SkipNextRoundedIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>

          <Stack direction="row" justifyContent="flex-end" sx={{ width: 150 }}>
            <Tooltip title="Vozes dos personagens">
              <IconButton onClick={onOpenVoices}>
                <RecordVoiceOverRoundedIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Configurações">
              <IconButton onClick={onOpenSettings}>
                <TuneRoundedIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Ocultar player">
              <IconButton onClick={() => onHiddenChange(true)} aria-label="Ocultar player">
                <KeyboardArrowDownRoundedIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Container>
    </Paper>
  );
}
