import type { MangaSummary } from "@packages/contracts";
import Link from "next/link";

import { mangaHref } from "@/lib/slug";
import { Cover } from "./Cover";
import { Icon, type IconName } from "./Icon";
import { ShelfScroller } from "./ShelfScroller";
import { StatusBadge } from "./StatusBadge";

/**
 * Horizontal "shelf" of works (Asura-style discovery row). Used on the home for
 * the trending/newest carousels so those views don't need their own page or nav
 * slot. Optional `moreHref` exposes the full paginated grid for that ordering.
 */
export function PosterRow({
  title,
  icon,
  items,
  moreHref,
}: {
  title: string;
  icon?: IconName;
  items: readonly MangaSummary[];
  moreHref?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="shelf">
      <div className="shelf-head">
        <h2 className="shelf-title">
          {icon && <Icon name={icon} size={18} />} {title}
        </h2>
        {moreHref && (
          <Link className="shelf-more" href={moreHref}>
            ver tudo <Icon name="chevron-right" size={14} />
          </Link>
        )}
      </div>
      <ShelfScroller>
        {items.map((m) => (
          <li key={m.id} className="shelf-card">
            <Link className="poster" href={mangaHref(m.id, m.name)}>
              <div className="poster-cover">
                <Cover src={m.imageUrl} alt={m.name} sizes="150px" />
                {m.status && (
                  <span className="poster-status">
                    <StatusBadge status={m.status} />
                  </span>
                )}
              </div>
              <div className="poster-name">{m.name}</div>
            </Link>
          </li>
        ))}
      </ShelfScroller>
    </section>
  );
}
