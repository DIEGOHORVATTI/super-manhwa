"use client";

import type { VoiceOption } from "@/lib/player/voices";

import { useEffect, useState, useSyncExternalStore } from "react";

import { browserVoiceOption, isPortuguese } from "@/lib/player/voices";
import { routes } from "@/lib/routes";

let cachedVoices: VoiceOption[] = [];
let cachedCount = -1;

function subscribe(onChange: () => void) {
  window.speechSynthesis.addEventListener("voiceschanged", onChange);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", onChange);
}

function getSnapshot() {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length !== cachedCount) {
    cachedCount = voices.length;
    cachedVoices = voices
      .map(browserVoiceOption)
      .toSorted(
        (a, b) => Number(isPortuguese(b)) - Number(isPortuguese(a)) || a.name.localeCompare(b.name),
      );
  }
  return cachedVoices;
}

export function useBrowserVoices() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

type NeuralVoicesState = { voices: VoiceOption[] | null; failed: boolean };

let neuralRequest: Promise<VoiceOption[]> | undefined;

function loadNeuralVoices() {
  neuralRequest ??= fetch(routes.api.ttsVoices)
    .then((response) => response.json() as Promise<{ voices: VoiceOption[] }>)
    .then(({ voices }) => {
      if (!voices.length) throw new Error("Sem vozes neurais");
      return voices;
    })
    .catch((error) => {
      neuralRequest = undefined;
      throw error;
    });
  return neuralRequest;
}

/** Microsoft Edge neural voices (pt-BR + multilingual), fetched once per session. */
export function useNeuralVoices(enabled: boolean): NeuralVoicesState {
  const [state, setState] = useState<NeuralVoicesState>({ voices: null, failed: false });

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadNeuralVoices()
      .then((voices) => active && setState({ voices, failed: false }))
      .catch(() => active && setState({ voices: null, failed: true }));
    return () => {
      active = false;
    };
  }, [enabled]);

  return state;
}
