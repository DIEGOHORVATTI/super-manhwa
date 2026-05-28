import type { MangaSort } from "@packages/contracts";
import Link from "next/link";

const TABS: Array<{ key: MangaSort; label: string }> = [
  { key: "popular", label: "Em alta" },
  { key: "newest", label: "Mais novos" },
  { key: "completed", label: "Completos" },
];

/**
 * Pure server-rendered tab strip. Switching tabs is a normal navigation —
 * RSC re-fetches with the new sort and the URL stays shareable.
 */
export function SortTabs({ active, lang }: { active: MangaSort; lang?: string }) {
  const hrefFor = (sort: MangaSort) => {
    const sp = new URLSearchParams();
    if (sort !== "popular") sp.set("sort", sort);
    if (lang) sp.set("lang", lang);
    const qs = sp.toString();
    return qs ? `/?${qs}` : "/";
  };
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
