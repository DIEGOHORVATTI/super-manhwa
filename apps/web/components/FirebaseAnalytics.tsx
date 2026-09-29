import Script from "next/script";

import { env } from "@/lib/env";

/**
 * Firebase Analytics for the web app (gtag with the Firebase measurement id). Visits
 * from the installed app (standalone display mode) carry `app_platform: pwa`.
 */
export function FirebaseAnalytics() {
  const id = env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
  if (!id) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="firebase-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
var installed = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
gtag("js", new Date());
gtag("set", "user_properties", { app_platform: installed ? "pwa" : "web" });
gtag("config", ${JSON.stringify(id)});`}
      </Script>
    </>
  );
}
