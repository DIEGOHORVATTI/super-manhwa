"use client";

import type { ReaderSettings } from "./use-reader-settings";
import type { VoiceContext, VoiceOverrides } from "@/lib/player/voices";

import { useRef, useMemo, useState, useEffect, useSyncExternalStore } from "react";

import { buildQueue } from "@/lib/player/voices";
import { buildScript } from "@/lib/player/script";
import { useBrowserVoices, useNeuralVoices } from "./use-voices";
import { SpeechPlayer } from "@/lib/player/speech-player";
import { NeuralAudioSpeaker, WebSpeechSpeaker } from "@/lib/player/speakers";

type UseChapterPlayerOptions = {
  paragraphs: string[];
  settings: ReaderSettings;
  overrides: VoiceOverrides;
  startParagraph: number;
  autoplay: boolean;
  onParagraphChange: (paragraph: number) => void;
  onFinished: () => void;
};

export function useChapterPlayer({
  paragraphs,
  settings,
  overrides,
  startParagraph,
  autoplay,
  onParagraphChange,
  onFinished,
}: UseChapterPlayerOptions) {
  const browserVoices = useBrowserVoices();
  const neural = useNeuralVoices(settings.engine === "neural");
  const engine = settings.engine === "neural" && !neural.failed ? "neural" : "browser";
  const voices = engine === "neural" ? neural.voices : browserVoices;
  const speaker = useMemo(
    () => (engine === "neural" ? new NeuralAudioSpeaker() : new WebSpeechSpeaker()),
    [engine],
  );
  const [player] = useState(() => new SpeechPlayer(startParagraph, speaker));
  const state = useSyncExternalStore(player.subscribe, player.getSnapshot);
  const pendingStart = useRef<{ paragraph: number; autoplay: boolean } | null>({
    paragraph: startParagraph,
    autoplay,
  });
  const mounted = useRef(false);
  const callbacks = useRef({ onParagraphChange, onFinished });
  callbacks.current = { onParagraphChange, onFinished };

  const script = useMemo(() => buildScript(paragraphs), [paragraphs]);

  const voiceContext = useMemo<VoiceContext>(
    () => ({
      voices: voices ?? [],
      overrides,
      narratorVoiceURI: settings.narratorVoiceURI,
      characterVoices: settings.characterVoices,
    }),
    [voices, overrides, settings.narratorVoiceURI, settings.characterVoices],
  );

  const queue = useMemo(
    () => (voices ? buildQueue(script, voiceContext) : []),
    [voices, script, voiceContext],
  );

  useEffect(() => player.setSpeaker(speaker), [player, speaker]);

  useEffect(() => {
    const start = pendingStart.current;
    if (!queue.length) return;

    if (!start) {
      player.load(queue);
      return;
    }

    pendingStart.current = null;
    player.load(queue, start.paragraph);
    if (start.autoplay) player.play();
  }, [player, queue]);

  useEffect(() => player.setRate(settings.rate), [player, settings.rate]);

  useEffect(() => {
    mounted.current = true;
    player.onFinished = () => callbacks.current.onFinished();
    return () => {
      mounted.current = false;
      setTimeout(() => !mounted.current && player.stop());
    };
  }, [player]);

  useEffect(() => {
    callbacks.current.onParagraphChange(state.paragraph);
  }, [state.paragraph]);

  return { player, state, script, voiceContext, engine, neuralFailed: neural.failed };
}
