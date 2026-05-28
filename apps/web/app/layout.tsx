import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: { default: "MangaVerse — leitor de mangás web", template: "%s · MangaVerse" },
  description: "Busque e leia mangás de várias fontes, num leitor web rápido.",
  openGraph: { type: "website", siteName: "MangaVerse" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body>
        <main className="app">
          <Link href="/" className="brand" style={{ color: "inherit" }}>
            <h1>MangaVerse<span className="dot">.</span></h1>
          </Link>
          <p className="subtitle">Leitor web · Next.js (RSC) · extensões Mangayomi</p>
          {children}
        </main>
      </body>
    </html>
  );
}
