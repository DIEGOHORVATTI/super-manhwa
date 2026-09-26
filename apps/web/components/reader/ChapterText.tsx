"use client";

import type { Segment } from "@/lib/player/script";
import type { EnglishMode } from "@/lib/player/voices";

import { useRef, useEffect } from "react";
import { varAlpha } from "minimal-shared/utils";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { splitSentences } from "@/lib/learning/tokenize";
import { NARRATOR } from "@/lib/player/script";

import type { WordTarget } from "./WordPopover";

type ChapterTextProps = {
  paragraphs: string[];
  english?: string[];
  englishMode: EnglishMode;
  lines: Segment[][];
  onWord: (target: WordTarget) => void;
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
  if (mode === "listen") return { main: portuguese, sub: english, englishSub: true };
  return {
    main: english,
    sub: mode === "read" || isActive ? portuguese : undefined,
    englishMain: true,
  };
}

const WORD = /(\p{L}[\p{L}\p{M}'’-]*)/u;

/** English text with each word in a span; clicks are delegated from the parent. */
function tappable(text: string) {
  let offset = 0;
  return text.split(WORD).map((part, index) => {
    const start = offset;
    offset += part.length;
    return index % 2 ? (
      <span key={index} className="w" data-start={start}>
        {part}
      </span>
    ) : (
      part
    );
  });
}

/** Word click inside an English paragraph → the word and the sentence around it. */
function wordFrom(event: React.MouseEvent, text: string): WordTarget | undefined {
  const span = event.target as HTMLElement;
  if (!span.classList.contains("w")) return undefined;
  event.stopPropagation();
  const start = Number(span.dataset.start);
  const sentence = splitSentences(text).find((item) => start < item.end)?.text ?? text;
  return { word: span.textContent ?? "", sentence, anchor: span };
}

const TAPPABLE_SX = {
  "& .w": { cursor: "pointer", borderRadius: 0.5 },
  "& .w:hover": { bgcolor: "action.selected" },
};

function speakerOf(line: Segment[]) {
  return line.find((segment) => segment.speaker !== NARRATOR)?.speaker;
}

export function ChapterText({
  paragraphs,
  english,
  englishMode,
  lines,
  onWord,
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
        const { main, sub, englishMain, englishSub } = textsFor(
          paragraph,
          english?.[index],
          englishMode,
          isActive,
        );
        const onClickText = (event: React.MouseEvent, text: string) => {
          const target = wordFrom(event, text);
          if (target) onWord(target);
        };

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
            <Typography
              onClick={englishMain ? (event) => onClickText(event, main) : undefined}
              sx={{ fontSize, lineHeight: 1.8, ...TAPPABLE_SX }}
            >
              {englishMain ? tappable(main) : main}
            </Typography>
            {sub && (
              <Typography
                color="text.secondary"
                onClick={englishSub ? (event) => onClickText(event, sub) : undefined}
                sx={{ fontSize: fontSize * 0.85, lineHeight: 1.7, ...TAPPABLE_SX }}
              >
                {englishSub ? tappable(sub) : sub}
              </Typography>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}
