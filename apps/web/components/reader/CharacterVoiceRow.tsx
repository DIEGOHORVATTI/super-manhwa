"use client";

import type { Gender } from "@/lib/player/script";
import type { VoiceStyle, VoiceChoice, VoiceOption, ResolvedVoice } from "@/lib/player/voices";

import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Slider from "@mui/material/Slider";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";

import { SelectAutocomplete } from "@/components/mui/SelectAutocomplete";

import { VOICE_STYLES } from "@/lib/player/voices";
import { VoiceSelect } from "./VoiceSelect";

type CharacterVoiceRowProps = {
  speaker: string;
  count: number;
  gender?: Gender;
  resolved: ResolvedVoice;
  override?: VoiceChoice;
  voices: VoiceOption[];
  onChange: (override?: VoiceChoice) => void;
  onPreview: () => void;
};

const GENDER_LABEL: Record<Gender, string> = { male: "masculino", female: "feminino" };

const STYLE_OPTIONS = Object.entries(VOICE_STYLES).map(([value, style]) => ({
  value: value as VoiceStyle,
  label: style.label,
}));

export function CharacterVoiceRow({
  speaker,
  count,
  gender,
  resolved,
  override,
  voices,
  onChange,
  onPreview,
}: CharacterVoiceRowProps) {
  const patch = (changes: VoiceChoice) => onChange({ ...override, ...changes });

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
          {speaker}
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {count} {count === 1 ? "trecho" : "trechos"}
            {gender && ` · ${GENDER_LABEL[gender]}`}
          </Typography>
        </Typography>
        {override && (
          <Button size="small" color="inherit" onClick={() => onChange(undefined)}>
            Automático
          </Button>
        )}
        <Tooltip title="Ouvir">
          <IconButton size="small" onClick={onPreview}>
            <PlayArrowRoundedIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <VoiceSelect
          label="Voz"
          value={override?.voiceURI ?? ""}
          voices={voices}
          emptyLabel={`Automática (${resolved.voice?.name ?? "padrão"})`}
          onChange={(voiceURI) => patch({ voiceURI: voiceURI || undefined })}
        />
        <SelectAutocomplete
          label="Estilo"
          value={resolved.style}
          options={STYLE_OPTIONS}
          onChange={(style) => patch({ style, pitch: undefined })}
          sx={{ minWidth: 190 }}
        />
      </Stack>

      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 64 }}>
          Tom {resolved.pitch.toFixed(2)}
        </Typography>
        <Slider
          size="small"
          value={resolved.pitch}
          min={0.1}
          max={2}
          step={0.05}
          onChange={(_, pitch) => patch({ pitch: pitch as number })}
        />
      </Stack>
    </Stack>
  );
}
