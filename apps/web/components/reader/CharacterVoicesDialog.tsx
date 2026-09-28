"use client";

import type { Script } from "@/lib/player/script";
import type { VoiceChoice, VoiceContext, VoiceOverrides } from "@/lib/player/voices";

import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";

import { BottomSheet } from "@/components/mui/BottomSheet";
import { characterVoice } from "@/lib/player/voices";
import { CharacterVoiceRow } from "./CharacterVoiceRow";

type CharacterVoicesDialogProps = {
  open: boolean;
  script: Script;
  context: VoiceContext;
  onChange: (overrides: VoiceOverrides) => void;
  onPreview: (speaker: string) => void;
  onClose: () => void;
};

function speakersOf(script: Script) {
  const counts = new Map<string, number>();
  script.lines.flat().forEach(({ speaker }) => counts.set(speaker, (counts.get(speaker) ?? 0) + 1));
  return [...counts]
    .toSorted((a, b) => b[1] - a[1])
    .map(([speaker, count]) => ({ speaker, count }));
}

function withoutEmpty(choice?: VoiceChoice) {
  const entries = Object.entries(choice ?? {}).filter(([, value]) => value !== undefined);
  return entries.length ? (Object.fromEntries(entries) as VoiceChoice) : undefined;
}

export function CharacterVoicesDialog({
  open,
  script,
  context,
  onChange,
  onPreview,
  onClose,
}: CharacterVoicesDialogProps) {
  const { overrides } = context;

  const update = (speaker: string, choice?: VoiceChoice) => {
    const others = Object.entries(overrides).filter(([name]) => name !== speaker);
    const cleaned = withoutEmpty(choice);
    onChange(Object.fromEntries(cleaned ? [...others, [speaker, cleaned]] : others));
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Vozes dos personagens">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Cada personagem mantém a mesma voz em todos os capítulos desta obra. Escolha um estilo
        (criança, idoso…) e ajuste o tom se precisar.
      </Typography>
      <Stack divider={<Divider />} spacing={2} sx={{ pb: 1 }}>
        {speakersOf(script).map(({ speaker, count }) => {
          const gender = script.genders.get(speaker);
          return (
            <CharacterVoiceRow
              key={speaker}
              speaker={speaker}
              count={count}
              gender={gender}
              resolved={characterVoice(speaker, gender, context)}
              override={overrides[speaker]}
              voices={context.voices}
              onChange={(choice) => update(speaker, choice)}
              onPreview={() => onPreview(speaker)}
            />
          );
        })}
      </Stack>
    </BottomSheet>
  );
}
