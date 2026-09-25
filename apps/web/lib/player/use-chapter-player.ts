"use client";

import type { ReaderSettings } from "./use-reader-settings";
import type { VoiceContext, VoiceOverrides } from "@/lib/player/voices";

import { useRef, useMemo, useState, useEffect, useSyncExternalStore } from "react";

import { buildQueue } from "@/lib/player/voices";
import { buildScript } from "@/lib/player/script";
import { useVoices } from "./use-voices";
import { SpeechPlayer } from "@/lib/player/speech-player";

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
  const voices = useVoices();
  const [player] = useState(() => new SpeechPlayer(startParagraph));
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
      voices,
      overrides,
      narratorVoiceURI: settings.narratorVoiceURI,
      characterVoices: settings.characterVoices,
    }),
    [voices, overrides, settings.narratorVoiceURI, settings.characterVoices],
  );

  const queue = useMemo(() => buildQueue(script, voiceContext), [script, voiceContext]);

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

  return { player, state, script, voiceContext };
}
