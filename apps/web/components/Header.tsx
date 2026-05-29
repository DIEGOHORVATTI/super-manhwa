"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Autocomplete } from "@/components/Autocomplete";
import { Icon, type IconName } from "@/components/Icon";

/**
 * Global app bar. Layout: contextual back button (router.back(), hidden on home)
 * → brand → primary tab nav (catalog shortcuts) → global search. Fixed-position
 * so it can detach into a compact floating island once scrolled.
 *
 * The nav doubles as the home catalog filter (the home page no longer renders
 * its own tab strip). It's a mobile-style segmented control: tabs are marked
 * active by matching the current URL (pathname + `?sort=`), and a single pill in
 * the accent color slides under the active tab. Because the layout (and this
 * header) persists across client navigation, the pill animates to the new tab.
 */
const NAV: ReadonlyArray<{ href: string; label: string; icon: IconName; sort: string | null }> = [
  { href: "/", label: "Início", icon: "house", sort: null },
  { href: "/?sort=popular", label: "Em alta", icon: "flame", sort: "popular" },
  { href: "/?sort=newest", label: "Novos", icon: "sparkles", sort: "newest" },
  { href: "/?sort=completed", label: "Completos", icon: "circle-check-big", sort: "completed" },
];

/** Renders the tab links + the sliding pill. `sort` is the active `?sort=`. */
function HeaderTabs({ sort }: { sort: string | null }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const activeIndex = isHome ? NAV.findIndex((i) => i.sort === sort) : -1;

  const tabRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  // Position the pill under the active tab; re-measure on resize (label collapse
  // at breakpoints changes tab widths). Tab geometry is relative to the nav, so
  // the header's compaction doesn't affect it.
  useEffect(() => {
    const measure = () => {
      const el = activeIndex >= 0 ? tabRefs.current[activeIndex] : null;
      setPill(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeIndex]);

  return (
    <nav className="header-nav" aria-label="Navegação principal">
      <span
        className="header-tab-pill"
        aria-hidden="true"
        style={
          pill
            ? { transform: `translateX(${pill.left}px)`, width: pill.width, opacity: 1 }
            : { opacity: 0 }
        }
      />
      {NAV.map((item, i) => {
        const active = i === activeIndex;
        return (
          <Link
            key={item.href}
            href={item.href}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
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

  // Past the threshold the bar detaches from the top into a floating, rounded
  // "island" (width/top/radius/border animate via CSS transition on the class).
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`app-header${scrolled ? " is-scrolled" : ""}`}>
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
