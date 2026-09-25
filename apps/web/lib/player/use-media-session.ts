"use client";

import type { PlayerStatus } from "./speech-player";

import { useEffect, useRef } from "react";

type MediaSessionOptions = {
  status: PlayerStatus;
  title: string;
  album: string;
  cover?: string;
  onPlay: () => void;
  onPause: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onSkip: (offset: 1 | -1) => void;
};

/** Hardware media keys, headset buttons and OS controls drive the narration. */
export function useMediaSession({ status, title, album, cover, ...handlers }: MediaSessionOptions) {
  const actions = useRef(handlers);
  actions.current = handlers;

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      album,
      artist: "Super Manhwa",
      artwork: cover ? [{ src: cover }] : [],
    });
  }, [title, album, cover]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    const bindings: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => actions.current.onPlay()],
      ["pause", () => actions.current.onPause()],
      ["nexttrack", () => (actions.current.onNext ?? (() => actions.current.onSkip(1)))()],
      ["previoustrack", () => (actions.current.onPrevious ?? (() => actions.current.onSkip(-1)))()],
      ["seekforward", () => actions.current.onSkip(1)],
      ["seekbackward", () => actions.current.onSkip(-1)],
    ];
    bindings.forEach(([action, handler]) => {
      try {
        session.setActionHandler(action, handler);
      } catch {
        return;
      }
    });
    return () => bindings.forEach(([action]) => session.setActionHandler(action, null));
  }, []);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = status === "playing" ? "playing" : "paused";
  }, [status]);
}
