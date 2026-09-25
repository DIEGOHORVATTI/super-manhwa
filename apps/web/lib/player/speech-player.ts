import type { Utterance } from "./voices";

export type PlayerStatus = "idle" | "playing" | "paused";

export type PlayerState = {
  status: PlayerStatus;
  paragraph: number;
  error?: string;
};

const INTERRUPTIONS = new Set(["interrupted", "canceled"]);
const MAX_CONSECUTIVE_ERRORS = 3;

export class SpeechPlayer {
  private static speaking?: SpeechPlayer;

  private queue: Utterance[] = [];
  private position = 0;
  private rate = 1;
  private generation = 0;
  private consecutiveErrors = 0;
  private current?: SpeechSynthesisUtterance;
  private listeners = new Set<() => void>();
  private state: PlayerState;

  constructor(paragraph = 0) {
    this.state = { status: "idle", paragraph };
  }

  onFinished?: () => void;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;

  load(queue: Utterance[], paragraph = this.state.paragraph) {
    this.queue = queue;
    this.position = this.firstPositionOf(paragraph);
    this.setState({ paragraph });
    if (this.state.status === "playing") this.speak();
  }

  setRate(rate: number) {
    if (rate === this.rate) return;
    this.rate = rate;
    if (this.state.status === "playing") this.speak();
  }

  play(paragraph?: number) {
    if (paragraph !== undefined) this.position = this.firstPositionOf(paragraph);
    this.setState({ status: "playing", error: undefined });
    this.speak();
  }

  pause() {
    this.silence();
    this.setState({ status: "paused" });
  }

  stop() {
    this.silence();
    this.setState({ status: "idle" });
  }

  toggle() {
    if (this.state.status === "playing") this.pause();
    else this.play();
  }

  seek(paragraph: number) {
    const target = Math.min(Math.max(paragraph, 0), this.lastParagraph());
    if (this.state.status === "playing") this.play(target);
    else this.load(this.queue, target);
  }

  skip(offset: 1 | -1) {
    this.seek(this.state.paragraph + offset);
  }

  private lastParagraph() {
    return this.queue.at(-1)?.paragraph ?? 0;
  }

  private firstPositionOf(paragraph: number) {
    const index = this.queue.findIndex((item) => item.paragraph >= paragraph);
    return index === -1 ? 0 : index;
  }

  private setState(patch: Partial<PlayerState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  private silence() {
    this.generation += 1;
    if (SpeechPlayer.speaking === this) window.speechSynthesis.cancel();
  }

  private advance(generation: number) {
    if (generation !== this.generation) return;
    this.position += 1;
    this.speak();
  }

  private fail(generation: number, error: string) {
    if (generation !== this.generation) return;
    this.consecutiveErrors += 1;

    if (error === "not-allowed" || this.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      this.stop();
      this.setState({
        error:
          error === "not-allowed"
            ? "O navegador bloqueou o áudio. Clique em reproduzir novamente."
            : `O sintetizador de voz falhou (${error}). Tente outra voz nas configurações.`,
      });
      return;
    }
    if (INTERRUPTIONS.has(error)) this.speak();
    else this.advance(generation);
  }

  private syncExternal(generation: number, status: PlayerStatus) {
    if (generation === this.generation && this.state.status !== status) this.setState({ status });
  }

  private speak() {
    this.generation += 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    const generation = this.generation;
    const item = this.queue[this.position];

    if (!item) {
      this.setState({ status: "idle" });
      this.onFinished?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.voice = item.voice ?? null;
    utterance.lang = item.voice?.lang ?? "pt-BR";
    utterance.pitch = item.pitch;
    utterance.rate = this.rate * item.rate;
    utterance.onend = () => {
      this.consecutiveErrors = 0;
      this.advance(generation);
    };
    utterance.onerror = (event) => this.fail(generation, event.error);
    utterance.onpause = () => this.syncExternal(generation, "paused");
    utterance.onresume = () => this.syncExternal(generation, "playing");

    this.current = utterance;
    SpeechPlayer.speaking = this;
    if (item.paragraph !== this.state.paragraph) this.setState({ paragraph: item.paragraph });
    window.speechSynthesis.speak(this.current);
  }
}

export function previewVoice(voice: SpeechSynthesisVoice | undefined, pitch: number, rate: number) {
  const utterance = new SpeechSynthesisUtterance("Olá! É assim que esta voz vai soar na história.");
  utterance.voice = voice ?? null;
  utterance.lang = voice?.lang ?? "pt-BR";
  utterance.pitch = pitch;
  utterance.rate = rate;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
