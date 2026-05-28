import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Super Manhwa — leitor de mangás web",
    template: "%s · Super Manhwa",
  },
  description: "Busque e leia mangás de várias fontes, num leitor web rápido.",
  openGraph: { type: "website", siteName: "Super Manhwa" },
};

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="pt-br">
      <body>
        <main className="app">
          <Link href="/" className="brand" style={{ color: "inherit" }}>
            <h1>
              Super Manhwa<span className="dot">.</span>
            </h1>
          </Link>

          {children}
        </main>
      </body>
    </html>
  );
}
