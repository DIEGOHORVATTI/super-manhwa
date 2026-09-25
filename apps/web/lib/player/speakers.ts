import type { Utterance } from "./voices";

export type SpeakHandlers = {
  onEnd: () => void;
  onError: (error: string) => void;
  onPause: () => void;
  onResume: () => void;
};

/**
 * One way of turning an utterance into sound. `pause`/`resume`/`setRate` return
 * true when the engine can do it in place; otherwise the player restarts the chunk.
 */
export type Speaker = {
  speak: (item: Utterance, rate: number, handlers: SpeakHandlers) => void;
  cancel: () => void;
  pause?: () => boolean;
  resume?: () => boolean;
  setRate?: (rate: number) => boolean;
  prefetch?: (items: Utterance[]) => void;
};

export class WebSpeechSpeaker implements Speaker {
  private current?: SpeechSynthesisUtterance;

  speak(item: Utterance, rate: number, handlers: SpeakHandlers) {
    const synth = window.speechSynthesis;
    synth.cancel();
    synth.resume();

    const utterance = new SpeechSynthesisUtterance(item.text);
    const voice = synth.getVoices().find((option) => option.voiceURI === item.voice?.id);
    utterance.voice = voice ?? null;
    utterance.lang = voice?.lang ?? "pt-BR";
    utterance.pitch = item.pitch;
    utterance.rate = rate * item.rate;
    utterance.onend = handlers.onEnd;
    utterance.onerror = (event) => handlers.onError(event.error);
    utterance.onpause = handlers.onPause;
    utterance.onresume = handlers.onResume;

    this.current = utterance;
    synth.speak(this.current);
  }

  cancel() {
    this.current = undefined;
    window.speechSynthesis.cancel();
  }
}

const PITCH_SPREAD = 40;
const PERCENT_LIMIT = 50;

const toPercent = (factor: number, spread: number) =>
  Math.round(Math.min(Math.max((factor - 1) * spread, -PERCENT_LIMIT), PERCENT_LIMIT));

/** Style pitch/rate are baked into the audio; the listener's speed is playbackRate. */
export function neuralUrl(item: Utterance) {
  const params = new URLSearchParams({
    v: item.voice?.id ?? "pt-BR-FranciscaNeural",
    p: String(toPercent(item.pitch, PITCH_SPREAD)),
    r: String(toPercent(item.rate, 100)),
    t: item.text,
  });
  return `/api/tts?${params}`;
}

export class NeuralAudioSpeaker implements Speaker {
  private audio?: HTMLAudioElement;
  private prefetched = new Set<string>();

  speak(item: Utterance, rate: number, handlers: SpeakHandlers) {
    this.cancel();
    const audio = new Audio(neuralUrl(item));
    audio.preservesPitch = true;
    audio.playbackRate = rate;
    audio.onended = handlers.onEnd;
    audio.onerror = () => handlers.onError("network");
    audio.onpause = () => !audio.ended && handlers.onPause();
    audio.onplay = handlers.onResume;
    this.audio = audio;
    audio.play().catch((error: DOMException) => {
      if (this.audio !== audio) return;
      handlers.onError(error.name === "NotAllowedError" ? "not-allowed" : "network");
    });
  }

  cancel() {
    const audio = this.audio;
    if (!audio) return;
    this.audio = undefined;
    audio.onended = audio.onerror = audio.onpause = audio.onplay = null;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }

  pause() {
    this.audio?.pause();
    return Boolean(this.audio);
  }

  resume() {
    if (!this.audio) return false;
    void this.audio.play().catch(() => {});
    return true;
  }

  setRate(rate: number) {
    if (this.audio) this.audio.playbackRate = rate;
    return true;
  }

  prefetch(items: Utterance[]) {
    for (const item of items) {
      const url = neuralUrl(item);
      if (this.prefetched.has(url)) continue;
      this.prefetched.add(url);
      void fetch(url, { priority: "low" } as RequestInit).catch(() => this.prefetched.delete(url));
    }
  }
}
