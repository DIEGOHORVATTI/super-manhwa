import "@fontsource-variable/public-sans";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow/700.css";
import "@fontsource/barlow/800.css";
import "./globals.css";
import { env } from "@/lib/env";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { Metadata } from "next";
import { AffiliateAttributor } from "@/components/AffiliateAttributor";
import { LibrarySync } from "@/components/LibrarySync";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ThemeProvider, themeConfig } from "@/theme";

export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Super Manhwa | Ler e Ouvir Novels em Português",
    template: "%s · Super Manhwa",
  },
  description:
    "Leia ou ouça light novels e web novels em português, de graça, com uma voz diferente para cada personagem. Capítulos novos todo dia.",
  keywords: [
    "ler novel",
    "light novel português",
    "web novel português",
    "ouvir novel",
    "audiobook novel",
    "novel online grátis",
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

export const viewport = { themeColor: "#0D0D0D" };

export default function RootLayout({ children }: React.PropsWithChildren) {
  const base = env.SITE_URL ?? "http://localhost:3000";
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
    <html lang="pt-br" suppressHydrationWarning>
      <body>
        <InitColorSchemeScript
          modeStorageKey={themeConfig.modeStorageKey}
          attribute={themeConfig.cssVariables.colorSchemeSelector}
          defaultMode={themeConfig.defaultMode}
        />
        <AppRouterCacheProvider>
          <ThemeProvider
            modeStorageKey={themeConfig.modeStorageKey}
            defaultMode={themeConfig.defaultMode}
          >
            <script
              type="application/ld+json"
              // Trusted, server-built JSON-LD (no user input).
              dangerouslySetInnerHTML={{ __html: JSON.stringify([siteLd, orgLd]) }}
            />
            <Header />
            <main className="app">
              {children}

              <Footer />
            </main>
            <Analytics />
            <SpeedInsights />
            <ServiceWorkerRegister />
            <AffiliateAttributor />
            <LibrarySync />
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
