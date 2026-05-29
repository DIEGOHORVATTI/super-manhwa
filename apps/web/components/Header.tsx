"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Autocomplete } from "@/components/Autocomplete";

/**
 * Sticky top app bar. Left: a contextual back button (router.back(), hidden on
 * the home page) + the brand logo linking home. Right: the global search
 * combobox, available on every page. The bar blurs the content scrolling under
 * it so it reads as a real header, not inline text.
 */
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
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
          </button>
        )}
        <Link href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/white_logo_super_manhuwa.png" alt="" />
          <span className="brand-name">
            Super Manhwa<span className="dot">.</span>
          </span>
        </Link>

        <div className="header-search">
          <Autocomplete />
        </div>
      </div>
    </header>
  );
}
