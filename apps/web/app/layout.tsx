import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { AdblockModal } from "@/components/AdblockModal";
import { AdsConsentProvider } from "@/components/AdsConsent";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Popunder } from "@/components/Popunder";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Super Manhwa — Ler Manhwas, Mangás e Webtoons Online Grátis",
    template: "%s · Super Manhwa",
  },
  description:
    "Leia manhwas, mangás e webtoons em português, de graça e atualizados todo dia. Milhares de obras como Solo Leveling com capítulos novos direto de várias fontes.",
  keywords: [
    "ler manhwa",
    "ler mangá online",
    "manhwa português",
    "webtoon grátis",
    "ler webtoon",
    "mangá online grátis",
    "super manhwa",
  ],
  applicationName: "Super Manhwa",
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
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  // Site-wide structured data: WebSite (with a SearchAction that hints Google at a
  // sitelinks search box) + Organization (brand name/logo for the knowledge panel).
  const siteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Super Manhwa",
    alternateName: "SuperManhwa",
    url: base,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${base}/?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Super Manhwa",
    url: base,
    logo: `${base}/android-icon-192x192.png`,
  };

  return (
    <html lang="pt-br">
      <body>
        <script
          type="application/ld+json"
          // Trusted, server-built JSON-LD (no user input).
          dangerouslySetInnerHTML={{ __html: JSON.stringify([siteLd, orgLd]) }}
        />
        <AdsConsentProvider>
          <Header />
          <main className="app">
            {children}

            <Footer />
          </main>
          <Analytics />
          <SpeedInsights />
          <ServiceWorkerRegister />
          <Popunder />
          <AdblockModal />
        </AdsConsentProvider>
      </body>
    </html>
  );
}
