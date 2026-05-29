import type { MangaSummary } from "@packages/contracts";
import Link from "next/link";

import { Icon, type IconName } from "./Icon";

/**
 * Numbered ranking rail (Asura-style "Popular Today"). A compact, ordered list
 * of works with a big rank index, thumbnail and title — meant to sit beside the
 * main grid on desktop and stack above it on phones. Purely presentational; the
 * caller decides what the ranking represents (trending, popular, …).
 */
export function RankingList({
  items,
  title,
  icon = "trending-up",
}: {
  items: readonly MangaSummary[];
  title: string;
  icon?: IconName;
}) {
  if (items.length === 0) return null;

  return (
    <aside className="rank" aria-label={title}>
      <h2 className="rank-head">
        <Icon name={icon} size={18} />
        {title}
      </h2>
      <ol className="rank-list">
        {items.map((m, i) => (
          <li key={m.id} className="rank-item">
            <Link className="rank-link" href={`/manga/${m.id}?n=${encodeURIComponent(m.name)}`}>
              <span className={`rank-no${i < 3 ? " is-top" : ""}`}>{i + 1}</span>
              <span className="rank-thumb">
                {m.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" src={m.imageUrl} alt="" />
                ) : (
                  <span className="rank-noimg" />
                )}
              </span>
              <span className="rank-meta">
                <span className="rank-name">{m.name}</span>
                {m.genres && m.genres.length > 0 && (
                  <span className="rank-genre">{m.genres.slice(0, 2).join(" · ")}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}
