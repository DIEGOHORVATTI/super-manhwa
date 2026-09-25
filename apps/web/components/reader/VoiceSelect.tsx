"use client";

import type { SelectOption } from "@/components/mui/SelectAutocomplete";

import { SelectAutocomplete } from "@/components/mui/SelectAutocomplete";

import type { VoiceOption } from "@/lib/player/voices";

import { isPortuguese } from "@/lib/player/voices";

type VoiceSelectProps = {
  label: string;
  value: string;
  voices: VoiceOption[];
  emptyLabel?: string;
  onChange: (voiceId: string) => void;
};

export function VoiceSelect({ label, value, voices, emptyLabel, onChange }: VoiceSelectProps) {
  const options: SelectOption<string>[] = [
    ...(emptyLabel ? [{ value: "", label: emptyLabel }] : []),
    ...voices.map((voice) => ({
      value: voice.id,
      label: `${voice.name} (${voice.lang})`,
      group: isPortuguese(voice)
        ? "Português"
        : voice.multilingual
          ? "Multilíngues (falam português)"
          : "Outros idiomas",
    })),
  ];

  return (
    <SelectAutocomplete
      label={label}
      value={value}
      options={options}
      onChange={onChange}
      sx={{ flex: 1, minWidth: 0 }}
    />
  );
}
