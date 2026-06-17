import type { Metadata } from "next";
import Link from "next/link";
import { LibraryView } from "@/components/LibraryView";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Biblioteca | Super Manhwa",
  description: "Suas obras salvas e leituras em andamento, guardadas neste navegador.",
  robots: { index: false },
};

export default function BibliotecaPage() {
  return (
    <div className="library-layout">
      <div className="library-main">
        <LibraryView />
      </div>
      {/* Fixed donation rail | desktop only (hidden on mobile via CSS). */}
      <aside className="library-aside" aria-label="Apoie o projeto">
        <div className="library-donate-card">
          <p className="muted">Curte o Super Manhwa? Ajude a manter o projeto no ar.</p>
          <Link href={routes.donate} className="footer-donate">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
              <path d="M12 21s-7.5-4.6-10-9.2C.5 8.4 2.2 5 5.5 5c1.9 0 3.3 1 4.5 2.4C11.2 6 12.6 5 14.5 5 17.8 5 19.5 8.4 22 11.8 19.5 16.4 12 21 12 21Z" />
            </svg>
            Apoiar via Pix
          </Link>
        </div>
      </aside>
    </div>
  );
}
