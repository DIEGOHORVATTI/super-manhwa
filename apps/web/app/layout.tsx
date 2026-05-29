import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Super Manhwa — leitor de mangás web",
    template: "%s · Super Manhwa",
  },
  description: "Busque e leia mangás, manhwas e webtoons num leitor web rápido.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
    ],
    apple: [{ url: "/apple-icon-180x180.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Super Manhwa", statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    siteName: "Super Manhwa",
    images: [{ url: "/banner_1500x500.jpeg", width: 1500, height: 500 }],
  },
  twitter: { card: "summary_large_image", images: ["/banner_1500x500.jpeg"] },
};

export const viewport = { themeColor: "#0e1016" };

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="pt-br">
      <body>
        <main className="app">
          <Link href="/" className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-logo" src="/white_logo_super_manhuwa.png" alt="" />
            <span className="brand-name">
              Super Manhwa<span className="dot">.</span>
            </span>
          </Link>

          {children}

          <Footer />
        </main>
      </body>
    </html>
  );
}
