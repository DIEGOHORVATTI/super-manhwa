"use client";
import Image from "next/image";
import { useState } from "react";

const MAX_RETRIES = 2;

/**
 * Detail-page poster. Mirrors {@link Cover}'s graceful handling (retry on a
 * transient error, then a "sem capa" placeholder) but fixed-size instead of
 * `fill`, so a deploy/CDN blip never latches a broken image until reload.
 */
export function DetailCover({ src, alt }: { src: string; alt: string }) {
  const [attempt, setAttempt] = useState(0);
  const [dead, setDead] = useState(false);
  if (dead) return <div className="detail-cover poster-noimg">sem capa</div>;
  const url = attempt === 0 ? src : `${src}${src.includes("?") ? "&" : "?"}r=${attempt}`;
  return (
    <Image
      className="detail-cover"
      src={url}
      alt={alt}
      width={160}
      height={240}
      sizes="160px"
      priority
      unoptimized
      onError={() => {
        if (attempt < MAX_RETRIES) setTimeout(() => setAttempt((a) => a + 1), 500 * (attempt + 1));
        else setDead(true);
      }}
    />
  );
}
