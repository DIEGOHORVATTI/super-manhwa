import Image from "next/image";

/**
 * Cover/thumbnail image via `next/image`. Covers are *public* (the backend signs
 * them with a permanent `?k=` tag), so they're safe to optimize, cache and serve
 * from the CDN — unlike chapter pages, which are session-signed and never go
 * through here. Renders with `fill`, so the parent must be positioned and sized
 * (e.g. `.poster-cover` has `aspect-ratio` + `position: relative`).
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
  if (!src) return <div className="poster-noimg">sem capa</div>;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      style={{ objectFit: "cover" }}
    />
  );
}
