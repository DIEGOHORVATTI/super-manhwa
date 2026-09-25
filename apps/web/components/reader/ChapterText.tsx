"use client";

import type { Segment } from "@/lib/player/script";

import { useRef, useEffect } from "react";
import { varAlpha } from "minimal-shared/utils";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { NARRATOR } from "@/lib/player/script";

type ChapterTextProps = {
  paragraphs: string[];
  lines: Segment[][];
  activeParagraph: number;
  followPlayback: boolean;
  fontSize: number;
  onSelectParagraph: (paragraph: number) => void;
};

function speakerOf(line: Segment[]) {
  return line.find((segment) => segment.speaker !== NARRATOR)?.speaker;
}

export function ChapterText({
  paragraphs,
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
            <Typography sx={{ fontSize, lineHeight: 1.8 }}>{paragraph}</Typography>
          </Box>
        );
      })}
    </Stack>
  );
}
