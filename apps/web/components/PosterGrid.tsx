import type { MangaSummary } from "@packages/contracts";
import Link from "next/link";

import { routes } from "@/lib/routes";
import { Cover } from "./Cover";
import { FavoriteButton } from "./FavoriteButton";
import { Flag } from "./Flag";
import { PosterProgressBadge } from "./PosterProgressBadge";
import { StatusBadge } from "./StatusBadge";

/** Grid covers render ~150px wide on desktop, up to ~33vw on phones. */
const COVER_SIZES = "(max-width: 620px) 33vw, 160px";

/**
 * Shared grid used by the home, genre pages, and any future listing. Each card
 * carries only the opaque id; the slug tail is the keyword-rich title used for
 * SEO and doubles as the fallback detail-lookup hint (de-slugified server-side).
 */
export function PosterGrid({
  items,
  banner,
}: {
  items: readonly MangaSummary[];
  banner?: React.ReactNode;
}) {
  if (items.length === 0) {
    return <p className="muted">Nada por aqui ainda.</p>;
  }
  return (
    <div className="poster-grid">
      {/* Banner é um item da grade fixado no canto sup. direito (2 colunas);
          grid-auto-flow: dense faz as obras preencherem o resto. */}
      {banner}
      {items.map((m, i) => {
        const href = routes.manga(m.id, m.name);
        return (
          <div key={m.id} className="poster">
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
              {/* Stretched link makes the whole cover clickable; the heart sits above it. */}
              <Link className="poster-hit" href={href} aria-label={m.name} tabIndex={-1} />
              <FavoriteButton compact id={m.id} name={m.name} imageUrl={m.imageUrl} />
              {m.description && (
                <div className="poster-desc" aria-hidden="true">
                  <p>{m.description}</p>
                </div>
              )}
            </div>
            <Link className="poster-name" href={href}>
              {m.name}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
