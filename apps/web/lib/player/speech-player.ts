import type { SpeakHandlers, Speaker } from "./speakers";
import type { ResolvedVoice, Utterance } from "./voices";

import { WebSpeechSpeaker } from "./speakers";

export type PlayerStatus = "idle" | "playing" | "paused";

export type PlayerState = {
  status: PlayerStatus;
  paragraph: number;
  error?: string;
};

const INTERRUPTIONS = new Set(["interrupted", "canceled"]);
const MAX_CONSECUTIVE_ERRORS = 3;
const PREFETCH_AHEAD = 3;
const PREVIEW_TEXT = "Olá! É assim que esta voz vai soar na história.";

export class SpeechPlayer {
  private static active?: SpeechPlayer;

  private queue: Utterance[] = [];
  private position = 0;
  private rate = 1;
  private generation = 0;
  private consecutiveErrors = 0;
  private pausedInPlace = false;
  private listeners = new Set<() => void>();
  private state: PlayerState;

  constructor(
    paragraph = 0,
    private speaker: Speaker = new WebSpeechSpeaker(),
  ) {
    this.state = { status: "idle", paragraph };
  }

  onFinished?: () => void;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;

  setSpeaker(speaker: Speaker) {
    if (speaker === this.speaker) return;
    this.silence();
    this.speaker = speaker;
    if (this.state.status === "playing") this.speak();
  }

  load(queue: Utterance[], paragraph = this.state.paragraph) {
    this.queue = queue;
    this.position = this.firstPositionOf(paragraph);
    this.pausedInPlace = false;
    this.setState({ paragraph });
    if (this.state.status === "playing") this.speak();
  }

  setRate(rate: number) {
    if (rate === this.rate) return;
    this.rate = rate;
    if (this.speaker.setRate?.(rate)) return;
    if (this.state.status === "playing") this.speak();
  }

  play(paragraph?: number) {
    if (paragraph === undefined && this.pausedInPlace && this.speaker.resume?.()) {
      this.pausedInPlace = false;
      this.setState({ status: "playing", error: undefined });
      return;
    }
    if (paragraph !== undefined) this.position = this.firstPositionOf(paragraph);
    this.setState({ status: "playing", error: undefined });
    this.speak();
  }

  pause() {
    if (this.state.status === "playing" && this.speaker.pause?.()) {
      this.pausedInPlace = true;
    } else {
      this.silence();
    }
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

  /** Plays a sample line with the given voice without touching the queue position. */
  preview(voice: ResolvedVoice) {
    this.silence();
    if (this.state.status === "playing") this.setState({ status: "paused" });
    SpeechPlayer.active = this;
    this.speaker.speak({ ...voice, paragraph: -1, text: PREVIEW_TEXT }, this.rate, {
      onEnd: () => {},
      onError: () => {},
      onPause: () => {},
      onResume: () => {},
    });
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
    this.pausedInPlace = false;
    if (SpeechPlayer.active === this) this.speaker.cancel();
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
            : `O sintetizador de voz falhou (${error}). Tente outra voz ou o outro motor nas configurações.`,
      });
      return;
    }
    if (INTERRUPTIONS.has(error) || error === "network") this.speak();
    else this.advance(generation);
  }

  private syncExternal(generation: number, status: PlayerStatus) {
    if (generation !== this.generation || this.state.status === status) return;
    this.pausedInPlace = status === "paused";
    this.setState({ status });
  }

  private speak() {
    this.generation += 1;
    this.pausedInPlace = false;
    const generation = this.generation;
    const item = this.queue[this.position];

    if (!item) {
      if (this.queue.length === 0) return;
      this.speaker.cancel();
      this.setState({ status: "idle" });
      this.onFinished?.();
      return;
    }

    const handlers: SpeakHandlers = {
      onEnd: () => {
        this.consecutiveErrors = 0;
        this.advance(generation);
      },
      onError: (error) => this.fail(generation, error),
      onPause: () => this.syncExternal(generation, "paused"),
      onResume: () => this.syncExternal(generation, "playing"),
    };

    SpeechPlayer.active = this;
    if (item.paragraph !== this.state.paragraph) this.setState({ paragraph: item.paragraph });
    this.speaker.speak(item, this.rate, handlers);
    this.speaker.prefetch?.(
      this.queue.slice(this.position + 1, this.position + 1 + PREFETCH_AHEAD),
    );
  }
}
