"use client";
import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";

type Consent = "unknown" | "accepted" | "rejected";
const STORAGE_KEY = "ads-consent";

const AdsConsentContext = createContext<Consent>("unknown");

/**
 * LGPD/GDPR consent gate for third-party ads. Holds the visitor's choice in
 * localStorage and exposes it via {@link useAdsConsent}. Ad components read the
 * context and stay no-op until it reads "accepted", so no Adsterra script ever
 * loads before the user opts in. Starts "unknown" on every render (server +
 * first client paint) to keep SSR markup stable; the stored choice is hydrated
 * in an effect.
 */
export function AdsConsentProvider({ children }: React.PropsWithChildren) {
  const [consent, setConsent] = useState<Consent>("unknown");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "accepted" || stored === "rejected") setConsent(stored);
    } catch {
      /* localStorage unavailable (private mode) — leave as unknown */
    }
  }, []);

  const decide = (value: Exclude<Consent, "unknown">) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    setConsent(value);
  };

  return (
    <AdsConsentContext.Provider value={consent}>
      {children}
      {consent === "unknown" && <ConsentBanner onDecide={decide} />}
    </AdsConsentContext.Provider>
  );
}

export function useAdsConsent(): Consent {
  return useContext(AdsConsentContext);
}

function ConsentBanner({ onDecide }: { onDecide: (v: "accepted" | "rejected") => void }) {
  return (
    <div className="consent-banner" role="dialog" aria-label="Consentimento de cookies e anúncios">
      <p className="consent-text">
        Usamos cookies e anúncios de parceiros para manter o site gratuito. Você pode aceitar ou
        recusar a personalização. Saiba mais na <Link href="/privacy">Política de Privacidade</Link>
        .
      </p>
      <div className="consent-actions">
        <button
          type="button"
          className="consent-btn consent-btn-ghost"
          onClick={() => onDecide("rejected")}
        >
          Recusar
        </button>
        <button
          type="button"
          className="consent-btn consent-btn-primary"
          onClick={() => onDecide("accepted")}
        >
          Aceitar
        </button>
      </div>
    </div>
  );
}
