import type { Gender, Script } from "./script";

import { NARRATOR } from "./script";

export type VoiceStyle = "crianca" | "adolescente" | "adulto" | "idoso" | "imponente";

export type VoiceChoice = {
  voiceURI?: string;
  style?: VoiceStyle;
  pitch?: number;
};

export type VoiceOverrides = Record<string, VoiceChoice>;

export type VoiceContext = {
  voices: SpeechSynthesisVoice[];
  narratorVoiceURI?: string;
  overrides: VoiceOverrides;
  characterVoices: boolean;
};

export type ResolvedVoice = {
  voice?: SpeechSynthesisVoice;
  style: VoiceStyle;
  pitch: number;
  rate: number;
};

export type Utterance = ResolvedVoice & {
  paragraph: number;
  text: string;
};

const FEMALE_VOICE =
  /female|mulher|maria|francisca|luciana|heloisa|leticia|thalita|brenda|elza|giovanna|leila|manuela|yara|camila|vitoria|raquel|google português/i;
const MALE_VOICE =
  /\bmale|homem|daniel|antonio|donato|fabio|humberto|julio|nicolau|valerio|ricardo|duarte/i;
export const VOICE_STYLES: Record<VoiceStyle, { label: string; pitch: number; rate: number }> = {
  crianca: { label: "Criança", pitch: 1.6, rate: 1.1 },
  adolescente: { label: "Adolescente", pitch: 1.25, rate: 1.06 },
  adulto: { label: "Adulto", pitch: 1, rate: 1 },
  idoso: { label: "Idoso", pitch: 0.8, rate: 0.85 },
  imponente: { label: "Grave / imponente", pitch: 0.65, rate: 0.9 },
};

const GENDER_PITCH: Record<Gender, number> = { female: 1.2, male: 0.8 };

const STYLE_BY_NOUN: Record<string, VoiceStyle> = Object.fromEntries([
  ...["criança", "menino", "menina", "garotinho", "garotinha", "bebê", "pirralho"].map((noun) => [
    noun,
    "crianca",
  ]),
  ...["garoto", "garota", "rapaz", "moça", "jovem", "adolescente"].map((noun) => [
    noun,
    "adolescente",
  ]),
  ...["velho", "velha", "idoso", "idosa", "ancião", "anciã", "avô", "avó", "vovô", "vovó"].map(
    (noun) => [noun, "idoso"],
  ),
  ...["rei", "imperador", "lorde", "general", "comandante", "dragão"].map((noun) => [
    noun,
    "imponente",
  ]),
]);
const MAX_CHUNK = 200;

export function estimateGender(voice: SpeechSynthesisVoice): Gender | undefined {
  if (FEMALE_VOICE.test(voice.name)) return "female";
  if (MALE_VOICE.test(voice.name)) return "male";
  return undefined;
}

export function isPortuguese(voice: SpeechSynthesisVoice) {
  return voice.lang.toLowerCase().startsWith("pt");
}

export function defaultNarratorVoice(voices: SpeechSynthesisVoice[]) {
  return (
    voices.find((voice) => voice.lang.toLowerCase() === "pt-br") ??
    voices.find(isPortuguese) ??
    voices[0]
  );
}

function hash(text: string) {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) % 2 ** 32;
  return value;
}

export function guessStyle(speaker: string): VoiceStyle {
  return STYLE_BY_NOUN[speaker.toLowerCase()] ?? "adulto";
}

function clampPitch(pitch: number) {
  return Number(Math.min(Math.max(pitch, 0.1), 2).toFixed(2));
}

function automaticVoice(
  speaker: string,
  gender: Gender | undefined,
  voices: SpeechSynthesisVoice[],
) {
  const portuguese = voices.filter(isPortuguese);
  const sameGender = portuguese.filter((voice) => gender && estimateGender(voice) === gender);
  const pool = sameGender.length ? sameGender : portuguese.length ? portuguese : voices;
  return pool[hash(speaker) % pool.length];
}

export function characterVoice(
  speaker: string,
  gender: Gender | undefined,
  context: VoiceContext,
): ResolvedVoice {
  const byUri = (uri?: string) => context.voices.find((voice) => voice.voiceURI === uri);
  const narrator = byUri(context.narratorVoiceURI) ?? defaultNarratorVoice(context.voices);
  const override = context.overrides[speaker];
  const isNarration = speaker === NARRATOR || !context.characterVoices;

  if (isNarration && !override) return { voice: narrator, style: "adulto", pitch: 1, rate: 1 };

  const style = override?.style ?? guessStyle(speaker);
  const preset = VOICE_STYLES[style];
  const pitchOffset = isNarration ? 0 : (Math.floor(hash(speaker) / 16) % 5) * 0.06 - 0.12;
  const automaticPitch = preset.pitch * (gender ? GENDER_PITCH[gender] : 1) + pitchOffset;

  return {
    voice:
      byUri(override?.voiceURI) ??
      (isNarration ? narrator : automaticVoice(speaker, gender, context.voices)) ??
      narrator,
    style,
    pitch: clampPitch(override?.pitch ?? automaticPitch),
    rate: preset.rate,
  };
}

export function splitIntoChunks(text: string, maxLength = MAX_CHUNK) {
  const sentences = text.match(/[^.!?…]+(?:[.!?…]+["'”»)]*\s*|$)/g) ?? [text];

  return sentences
    .reduce<string[]>((chunks, sentence) => {
      const last = chunks.at(-1);
      if (last && last.length + sentence.length <= maxLength)
        chunks[chunks.length - 1] = last + sentence;
      else chunks.push(sentence);
      return chunks;
    }, [])
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

export function buildQueue(script: Script, context: VoiceContext): Utterance[] {
  const cache = new Map<string, ResolvedVoice>();
  const resolve = (speaker: string) => {
    if (!cache.has(speaker)) {
      cache.set(speaker, characterVoice(speaker, script.genders.get(speaker), context));
    }
    return cache.get(speaker)!;
  };

  return script.lines.flatMap((segments, paragraph) =>
    segments.flatMap((segment) =>
      splitIntoChunks(segment.text).map((text) => ({
        paragraph,
        text,
        ...resolve(segment.speaker),
      })),
    ),
  );
}
