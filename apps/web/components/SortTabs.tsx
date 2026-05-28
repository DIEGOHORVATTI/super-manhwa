import type { MangaSort } from "@packages/contracts";
import Link from "next/link";

const TABS: Array<{ key: MangaSort; label: string }> = [
  { key: "popular", label: "Em alta" },
  { key: "newest", label: "Mais novos" },
  { key: "completed", label: "Completos" },
];

/**
 * Pure server-rendered tab strip. Switching tabs is a normal navigation —
 * RSC re-fetches with the new sort and the URL stays shareable. Language is
 * pinned at pt-br by the frontend; there's no `?lang=` to round-trip.
 */
export function SortTabs({ active }: { active: MangaSort }) {
  const hrefFor = (sort: MangaSort) => (sort === "popular" ? "/" : `/?sort=${sort}`);
  return (
    <nav className="sort-tabs" aria-label="Ordenação">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={hrefFor(t.key)}
          className={`sort-tab${active === t.key ? " is-active" : ""}`}
          aria-current={active === t.key ? "page" : undefined}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
