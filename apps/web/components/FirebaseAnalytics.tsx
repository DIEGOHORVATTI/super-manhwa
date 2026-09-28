import Script from "next/script";

import { env } from "@/lib/env";

/**
 * Firebase Analytics for the web app (gtag with the Firebase measurement id). Launches
 * from the Play Store app arrive with an `android-app://` referrer; the flag is kept in
 * sessionStorage so every event of that visit carries `app_platform: android`.
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
var android = false;
try {
  android = document.referrer.indexOf("android-app://") === 0 || sessionStorage.getItem("sm-twa") === "1";
  if (android) sessionStorage.setItem("sm-twa", "1");
} catch (e) {}
gtag("js", new Date());
gtag("set", "user_properties", { app_platform: android ? "android" : "web" });
gtag("config", ${JSON.stringify(id)});`}
      </Script>
    </>
  );
}
