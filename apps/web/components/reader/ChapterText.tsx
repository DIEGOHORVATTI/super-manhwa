"use client";

import type { Segment } from "@/lib/player/script";
import type { EnglishMode } from "@/lib/player/voices";

import { useRef, useEffect } from "react";
import { varAlpha } from "minimal-shared/utils";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { NARRATOR } from "@/lib/player/script";

type ChapterTextProps = {
  paragraphs: string[];
  english?: string[];
  englishMode: EnglishMode;
  lines: Segment[][];
  activeParagraph: number;
  followPlayback: boolean;
  fontSize: number;
  onSelectParagraph: (paragraph: number) => void;
};

/** Main text plus the smaller line under it: listen shows PT over EN, read EN over PT, immersion EN (PT only on the paragraph being narrated). */
function textsFor(
  portuguese: string,
  english: string | undefined,
  mode: EnglishMode,
  isActive: boolean,
) {
  if (english === undefined || mode === "off") return { main: portuguese };
  if (mode === "listen") return { main: portuguese, sub: english };
  return { main: english, sub: mode === "read" || isActive ? portuguese : undefined };
}

function speakerOf(line: Segment[]) {
  return line.find((segment) => segment.speaker !== NARRATOR)?.speaker;
}

export function ChapterText({
  paragraphs,
  english,
  englishMode,
  lines,
  activeParagraph,
  followPlayback,
  fontSize,
  onSelectParagraph,
}: ChapterTextProps) {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center" });
  }, []);

  useEffect(() => {
    if (followPlayback) activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeParagraph, followPlayback]);

  return (
    <Stack spacing={0.5}>
      {paragraphs.map((paragraph, index) => {
        const isActive = index === activeParagraph;
        const speaker = speakerOf(lines[index]);
        const { main, sub } = textsFor(paragraph, english?.[index], englishMode, isActive);

        return (
          <Box
            key={index}
            ref={isActive ? activeRef : undefined}
            onClick={() => onSelectParagraph(index)}
            sx={(theme) => ({
              px: 2,
              py: 1,
              borderRadius: 1.5,
              cursor: "pointer",
              transition: theme.transitions.create("background-color"),
              "&:hover": { bgcolor: "action.hover" },
              ...(isActive && {
                bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.12),
                "&:hover": { bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.16) },
              }),
            })}
          >
            {isActive && speaker && (
              <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                {speaker}
              </Typography>
            )}
            <Typography sx={{ fontSize, lineHeight: 1.8 }}>{main}</Typography>
            {sub && (
              <Typography
                color="text.secondary"
                sx={{ fontSize: fontSize * 0.85, lineHeight: 1.7 }}
              >
                {sub}
              </Typography>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}
