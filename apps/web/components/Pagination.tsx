import Link from "next/link";

import { Icon } from "./Icon";

/**
 * Prev/next pager for listing pages. The catalog can't cheaply report a total
 * count, so there's no last-page jump — we render a windowed strip of nearby
 * page numbers around the current one, gated forward by the source's
 * `hasNextPage`. `buildHref` keeps the caller in control of the query shape
 * (sort, genre, …) so the pager stays route-agnostic.
 */
export function Pagination({
  page,
  hasNextPage,
  buildHref,
}: {
  page: number;
  hasNextPage: boolean;
  buildHref: (page: number) => string;
}) {
  if (page <= 1 && !hasNextPage) return null;

  // A small window of page numbers around the current page (no total is known).
  const from = Math.max(1, page - 2);
  const to = hasNextPage ? page + 2 : page;
  const numbers: number[] = [];
  for (let p = from; p <= to; p++) numbers.push(p);

  return (
    <nav className="pager" aria-label="Paginação">
      <Link
        className={`pager-btn${page <= 1 ? " is-disabled" : ""}`}
        href={buildHref(page - 1)}
        aria-disabled={page <= 1}
        aria-label="Página anterior"
        tabIndex={page <= 1 ? -1 : undefined}
      >
        <Icon name="chevron-left" size={16} />
        <span>Anterior</span>
      </Link>

      <div className="pager-pages">
        {from > 1 && <span className="pager-ellipsis">…</span>}
        {numbers.map((p) => (
          <Link
            key={p}
            className={`pager-num${p === page ? " is-active" : ""}`}
            href={buildHref(p)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </Link>
        ))}
        {hasNextPage && <span className="pager-ellipsis">…</span>}
      </div>

      <Link
        className={`pager-btn${!hasNextPage ? " is-disabled" : ""}`}
        href={buildHref(page + 1)}
        aria-disabled={!hasNextPage}
        aria-label="Próxima página"
        tabIndex={!hasNextPage ? -1 : undefined}
      >
        <span>Próximo</span>
        <Icon name="chevron-right" size={16} />
      </Link>
    </nav>
  );
}
