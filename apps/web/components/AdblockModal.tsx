"use client";
import { useEffect, useState } from "react";
import { useAdsConsent } from "@/components/AdsConsent";

/**
 * Detects an ad blocker / antivirus shield and, when one is found, hard-gates
 * the site behind a non-dismissible modal: the visitor must allow-list the
 * domain and reload to continue (ads are what keep it free). Runs only after
 * the LGPD consent is accepted — there's no point gating someone who hasn't
 * opted into ads. Detection is two-pronged: a DOM "bait" element that
 * class-based blockers hide, plus a request to a known ad host that
 * network-level blockers kill.
 */
export function AdblockModal() {
  const consent = useAdsConsent();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (consent !== "accepted") return;
    let alive = true;
    detectAdblock().then((isBlocked) => {
      if (alive && isBlocked) setBlocked(true);
    });
    return () => {
      alive = false;
    };
  }, [consent]);

  if (!blocked) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Bloqueador detectado"
    >
      <div className="modal-card adblock-card">
        <img
          className="adblock-gif"
          src="https://media.tenor.com/cZAW8f5L1O0AAAAM/sad-anime.gif"
          alt="Personagem de anime triste"
          width={220}
          height={124}
        />
        <h2 className="adblock-title">Detectamos um bloqueador de anúncios</h2>
        <p className="adblock-text">
          O Super Manhwa é gratuito graças aos anúncios. Seu bloqueador ou antivírus está impedindo
          que eles carreguem. Para continuar apoiando o site, desative o bloqueio para este domínio
          e recarregue a página.
        </p>
        <ol className="adblock-steps">
          <li>Clique no ícone do bloqueador (ex.: uBlock, AdBlock) ou do antivírus.</li>
          <li>Selecione “Desativar neste site” / “Pausar neste domínio”.</li>
          <li>Recarregue a página.</li>
        </ol>
        <div className="adblock-actions">
          <button
            type="button"
            className="consent-btn consent-btn-primary"
            onClick={() => window.location.reload()}
          >
            Já desativei vamos recarregar
          </button>
        </div>
      </div>
    </div>
  );
}

/** Returns true when an ad blocker is detected (DOM bait or blocked request). */
async function detectAdblock(): Promise<boolean> {
  // 1) DOM bait — class-based blockers set these to display:none.
  const bait = document.createElement("div");
  bait.className = "adsbox ad-banner ads pub_300x250 adsbygoogle";
  bait.style.cssText =
    "position:absolute;left:-9999px;top:-9999px;height:10px;width:10px;pointer-events:none;";
  bait.innerHTML = "&nbsp;";
  document.body.appendChild(bait);
  await new Promise((r) => setTimeout(r, 120));
  const hidden =
    bait.offsetHeight === 0 || bait.clientHeight === 0 || getComputedStyle(bait).display === "none";
  bait.remove();
  if (hidden) return true;

  // 2) Network bait — network-level blockers (uBlock, antivirus) abort requests
  // to known ad hosts. A successful opaque response just resolves; a block throws.
  try {
    await fetch("https://www.highperformanceformat.com/favicon.ico", {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
    });
    return false;
  } catch {
    return true;
  }
}
