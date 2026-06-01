"use client";
import { useEffect, useRef } from "react";
import { useAdsConsent } from "@/components/AdsConsent";

/**
 * Adsterra Native Banner. Takes the full invoke.js URL from the dashboard
 * (`NEXT_PUBLIC_ADSTERRA_NATIVE_SRC`) because the host carries an
 * account-specific subdomain that varies per publisher — building it from a
 * bare key would break. The matching container id is `container-<hash>`, where
 * the hash is the path segment before `/invoke.js`, so we derive it from the
 * same URL. Injects the script once after consent and removes it on unmount.
 * No-op until ads are accepted or when the src is unset.
 */
export function NativeAd({ src }: { src?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const consent = useAdsConsent();
  const containerId = src ? `container-${src.match(/\/([a-f0-9]+)\/invoke\.js/)?.[1] ?? ""}` : "";

  useEffect(() => {
    if (consent !== "accepted" || !src || !ref.current) return;
    const script = document.createElement("script");
    script.async = true;
    script.dataset.cfasync = "false";
    script.src = src;
    ref.current.appendChild(script);
    return () => {
      script.remove();
    };
  }, [consent, src]);

  if (consent !== "accepted" || !src) return null;

  return (
    <div className="ad-slot ad-slot-native" aria-label="Publicidade">
      <span className="ad-head">
        <span className="ad-label">Publicidade</span>
        <span className="ad-disclaimer">
          — ⚠️ Não acredite em bets, promessas de dinheiro fácil são golpe.
        </span>
      </span>
      <div ref={ref} id={containerId} />
    </div>
  );
}
