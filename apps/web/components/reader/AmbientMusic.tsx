"use client";

import { useEffect, useRef, useState } from "react";

// Faixas CC0 de RandomMind (opengameart.org/users/randommind), recodificadas em 96 kbps.
const TRACKS = ["the-old-tower-inn", "the-bards-tale", "rejoicing", "minstrel-dance"];

export function AmbientMusic({ volume }: { volume: number }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [track, setTrack] = useState(() => Math.floor(Math.random() * TRACKS.length));

  useEffect(() => {
    if (audio.current) audio.current.volume = volume / 100;
  }, [volume, track]);

  // Com a música salva como ligada, o navegador barra o autoplay até a primeira interação.
  useEffect(() => {
    const start = () => void audio.current?.play().catch(() => {});
    const events = ["pointerdown", "keydown"];
    audio.current?.play().catch(() => {
      for (const event of events) window.addEventListener(event, start, { once: true });
    });
    return () => {
      for (const event of events) window.removeEventListener(event, start);
    };
  }, []);

  return (
    <audio
      ref={audio}
      src={`/music/${TRACKS[track]}.mp3`}
      autoPlay
      onEnded={() => setTrack((current) => (current + 1) % TRACKS.length)}
    />
  );
}
