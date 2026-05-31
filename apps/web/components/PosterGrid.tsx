import type { MangaSummary } from "@packages/contracts";
import Link from "next/link";

import { Cover } from "./Cover";
import { FavoriteButton } from "./FavoriteButton";
import { Flag } from "./Flag";
import { PosterProgressBadge } from "./PosterProgressBadge";
import { StatusBadge } from "./StatusBadge";

/** Grid covers render ~150px wide on desktop, up to ~33vw on phones. */
const COVER_SIZES = "(max-width: 620px) 33vw, 160px";

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
      {items.map((m, i) => (
        <div key={m.id} className="poster">
          <Link className="poster-link" href={`/manga/${m.id}?n=${encodeURIComponent(m.name)}`}>
            <div className="poster-cover">
              <Cover src={m.imageUrl} alt={m.name} sizes={COVER_SIZES} priority={i < 6} />
              {m.status && (
                <span className="poster-status">
                  <StatusBadge status={m.status} />
                </span>
              )}
              {m.langs && m.langs.length > 0 && (
                <span className="poster-langs">
                  {m.langs.map((l) => (
                    <Flag key={l} lang={l} size={18} title={l} />
                  ))}
                </span>
              )}
              <PosterProgressBadge id={m.id} />
            </div>
            <div className="poster-name">{m.name}</div>
          </Link>
          <FavoriteButton compact id={m.id} name={m.name} imageUrl={m.imageUrl} />
        </div>
      ))}
    </div>
  );
}
