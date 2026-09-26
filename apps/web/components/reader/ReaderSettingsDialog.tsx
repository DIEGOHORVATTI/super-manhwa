"use client";

import type { ReaderSettings } from "@/lib/player/use-reader-settings";
import type { VoiceEngine, VoiceOption } from "@/lib/player/voices";

import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Dialog from "@mui/material/Dialog";
import Slider from "@mui/material/Slider";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import FormControlLabel from "@mui/material/FormControlLabel";

import { SelectAutocomplete } from "@/components/mui/SelectAutocomplete";

import { VoiceSelect } from "./VoiceSelect";
import { defaultNarratorVoice } from "@/lib/player/voices";
import { RATE_OPTIONS } from "@/lib/player/use-reader-settings";

const ENGINE_OPTIONS: { value: VoiceEngine; label: string }[] = [
  { value: "neural", label: "Neurais (Microsoft Edge) — mais naturais" },
  { value: "browser", label: "Do navegador — funcionam offline" },
];

type ReaderSettingsDialogProps = {
  open: boolean;
  settings: ReaderSettings;
  voices: VoiceOption[];
  neuralFailed: boolean;
  onChange: (patch: Partial<ReaderSettings>) => void;
  onClose: () => void;
};

export function ReaderSettingsDialog({
  open,
  settings,
  voices,
  neuralFailed,
  onChange,
  onClose,
}: ReaderSettingsDialogProps) {
  const narrator =
    voices.find((voice) => voice.id === settings.narratorVoiceURI) ?? defaultNarratorVoice(voices);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Configurações</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <Stack spacing={1}>
            <SelectAutocomplete
              label="Vozes"
              value={settings.engine}
              options={ENGINE_OPTIONS}
              onChange={(engine) => onChange({ engine })}
            />
            {settings.engine === "neural" && neuralFailed && (
              <Alert severity="warning">
                As vozes neurais estão indisponíveis agora; usando as vozes do navegador.
              </Alert>
            )}
          </Stack>

          <VoiceSelect
            label="Voz do narrador"
            value={narrator?.id ?? ""}
            voices={voices}
            onChange={(voiceId) => onChange({ narratorVoiceURI: voiceId })}
          />

          <SelectAutocomplete
            label="Velocidade"
            value={settings.rate}
            options={RATE_OPTIONS}
            onChange={(rate) => onChange({ rate })}
          />

          <div>
            <Typography variant="subtitle2">Tamanho do texto: {settings.fontSize}px</Typography>
            <Slider
              value={settings.fontSize}
              min={14}
              max={28}
              onChange={(_, fontSize) => onChange({ fontSize: fontSize as number })}
            />
          </div>

          <div>
            <Typography variant="subtitle2">
              Volume da música ambiente: {settings.musicVolume}%
            </Typography>
            <Slider
              value={settings.musicVolume}
              min={0}
              max={100}
              onChange={(_, musicVolume) => onChange({ musicVolume: musicVolume as number })}
            />
          </div>

          <FormControlLabel
            control={
              <Switch
                checked={settings.characterVoices}
                onChange={(event) => onChange({ characterVoices: event.target.checked })}
              />
            }
            label="Vozes diferentes por personagem"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.autoAdvance}
                onChange={(event) => onChange({ autoAdvance: event.target.checked })}
              />
            }
            label="Tocar o próximo capítulo automaticamente"
          />
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
