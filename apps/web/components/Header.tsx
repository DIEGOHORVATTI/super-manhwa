"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Autocomplete } from "@/components/Autocomplete";
import { Icon, type IconName } from "@/components/Icon";

/**
 * Global sticky app bar. Layout: contextual back button (router.back(), hidden
 * on home) → brand → primary tab nav (catalog shortcuts) → global search. Blurs
 * the content scrolling under it so it reads as a real header.
 *
 * The nav doubles as the home catalog filter (the home page no longer renders
 * its own tab strip). Tabs are marked active by matching the current URL — the
 * pathname plus the `?sort=` query — and the underline animates between them on
 * client-side navigation because the layout (and this header) persists.
 */
const NAV: ReadonlyArray<{ href: string; label: string; icon: IconName; sort: string | null }> = [
  { href: "/", label: "Início", icon: "house", sort: null },
  { href: "/?sort=popular", label: "Em alta", icon: "flame", sort: "popular" },
  { href: "/?sort=newest", label: "Novos", icon: "sparkles", sort: "newest" },
  { href: "/?sort=completed", label: "Completos", icon: "circle-check-big", sort: "completed" },
];

/** Renders the tab links. `sort` is the active `?sort=` value (null = none). */
function HeaderTabs({ sort }: { sort: string | null }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <nav className="header-nav" aria-label="Navegação principal">
      {NAV.map((item) => {
        const active = isHome && item.sort === sort;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`header-tab${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon name={item.icon} size={17} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Reads the active sort from the URL. Isolated so it can sit behind Suspense. */
function HeaderTabsWithSort() {
  const sort = useSearchParams().get("sort");
  return <HeaderTabs sort={sort} />;
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="app-header">
      <div className="app-header-inner">
        {!isHome && (
          <button
            type="button"
            className="header-back"
            onClick={() => router.back()}
            aria-label="Voltar"
          >
            <Icon name="arrow-left" size={18} />
          </button>
        )}

        <Link href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/white_logo_super_manhuwa.png" alt="" />
          <span className="brand-name">
            Super Manhwa<span className="dot">.</span>
          </span>
        </Link>

        {/* useSearchParams must live under a Suspense boundary so static pages
            (about, terms, …) don't deopt to client rendering at build time. */}
        <Suspense fallback={<HeaderTabs sort={null} />}>
          <HeaderTabsWithSort />
        </Suspense>

        <div className="header-search">
          <Autocomplete />
        </div>
      </div>
    </header>
  );
}
