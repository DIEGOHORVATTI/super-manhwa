import Link from "next/link";
import type { MangaSummary } from "@packages/contracts";

import { StatusBadge } from "./StatusBadge";

/**
 * Shared grid used by the home, genre pages, and any future listing. Each card
 * carries only the opaque id; the `?n=` query is the title hint used for SEO,
 * fallback detail lookup, and the reader's back-button label.
 */
export function PosterGrid({ items }: { items: readonly MangaSummary[] }) {
  if (items.length === 0) {
    return <p className="muted">Nada por aqui ainda.</p>;
  }
  return (
    <div className="poster-grid">
      {items.map((m) => (
        <Link key={m.id} className="poster" href={`/manga/${m.id}?n=${encodeURIComponent(m.name)}`}>
          <div className="poster-cover">
            {m.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img loading="lazy" src={m.imageUrl} alt={m.name} />
            ) : (
              <div className="poster-noimg">sem capa</div>
            )}
            {m.status && (
              <span className="poster-status">
                <StatusBadge status={m.status} />
              </span>
            )}
          </div>
          <div className="poster-name">{m.name}</div>
        </Link>
      ))}
    </div>
  );
}
