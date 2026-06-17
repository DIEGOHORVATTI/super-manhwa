"use client";
import Image from "next/image";
import { useState } from "react";

/**
 * Cover/thumbnail image via `next/image`. Covers are *public* (the backend signs
 * them with a permanent `?k=` tag), so they're safe to optimize, cache and serve
 * from the CDN | unlike chapter pages, which are session-signed and never go
 * through here. Renders with `fill`, so the parent must be positioned and sized
 * (e.g. `.poster-cover` has `aspect-ratio` + `position: relative`).
 *
 * An external cover can die (a connector starts blocking hotlinks, a stale signed
 * path in localStorage history, source down) | `onError` then degrades to the
 * "sem capa" placeholder instead of a broken-image icon.
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
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className="poster-noimg">sem capa</div>;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      style={{ objectFit: "cover" }}
      onError={() => setFailed(true)}
    />
  );
}
