"use client";

import type { VoiceOverrides } from "@/lib/player/voices";

import { useStoredState } from "@/lib/use-stored-state";

export type ReaderSettings = {
  rate: number;
  fontSize: number;
  narratorVoiceURI?: string;
  characterVoices: boolean;
  autoAdvance: boolean;
};

export const RATE_OPTIONS = [0.5, 0.75, 0.9, 1, 1.1, 1.2, 1.25, 1.5, 1.75, 2, 2.5].map((rate) => ({
  value: rate,
  label: `${rate}x`,
}));

const DEFAULT_SETTINGS: ReaderSettings = {
  rate: 1,
  fontSize: 18,
  characterVoices: true,
  autoAdvance: true,
};

const NO_OVERRIDES: VoiceOverrides = {};

export function useReaderSettings() {
  return useStoredState<ReaderSettings>("reader-settings", DEFAULT_SETTINGS);
}

export function useCharacterVoices(novelSlug: string) {
  const { state, setState } = useStoredState<Record<string, VoiceOverrides>>(
    "character-voices",
    {},
  );
  const overrides = state[novelSlug] ?? NO_OVERRIDES;

  const setOverrides = (next: VoiceOverrides) => setState({ [novelSlug]: next });

  return { overrides, setOverrides };
}
