"use client";

import { useSyncExternalStore } from "react";

import { isPortuguese } from "@/lib/player/voices";

let cachedVoices: SpeechSynthesisVoice[] = [];

function subscribe(onChange: () => void) {
  window.speechSynthesis.addEventListener("voiceschanged", onChange);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", onChange);
}

function getSnapshot() {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length !== cachedVoices.length) {
    cachedVoices = voices.toSorted(
      (a, b) => Number(isPortuguese(b)) - Number(isPortuguese(a)) || a.name.localeCompare(b.name),
    );
  }
  return cachedVoices;
}

export function useVoices() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
