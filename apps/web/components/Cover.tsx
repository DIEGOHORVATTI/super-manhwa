"use client";
import Image from "next/image";
import { useState } from "react";

const MAX_RETRIES = 2;

/**
 * Cover/thumbnail image via `next/image`. Covers are *public* (the backend signs
 * them with a permanent `?k=` tag), so they're safe to optimize, cache and serve
 * from the CDN | unlike chapter pages, which are session-signed and never go
 * through here. Renders with `fill`, so the parent must be positioned and sized
 * (e.g. `.poster-cover` has `aspect-ratio` + `position: relative`).
 *
 * An external cover can die (a connector starts blocking hotlinks, a stale signed
 * path in localStorage history, source down) | `onError` retries a couple times
 * (cache-busted) before degrading to the "sem capa" placeholder, so a transient
 * blip (deploy, CDN hiccup) doesn't latch the fallback until a reload.
 */
export function Cover({
  src,
  alt,
  sizes,
  priority,
  className,
}: {
  src?: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className="poster-noimg">sem capa</div>;
  const url = attempt === 0 ? src : `${src}${src.includes("?") ? "&" : "?"}r=${attempt}`;
  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      style={{ objectFit: "cover" }}
      onError={() => {
        if (attempt < MAX_RETRIES) setTimeout(() => setAttempt((a) => a + 1), 500 * (attempt + 1));
        else setFailed(true);
      }}
    />
  );
}
