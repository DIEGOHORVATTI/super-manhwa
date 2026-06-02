"use client";
import { useEffect, useState } from "react";
import { useAdsConsent } from "@/components/AdsConsent";

/**
 * Detects an ad blocker / antivirus shield and, when one is found, hard-gates
 * the site behind a non-dismissible modal: the visitor must allow-list the
 * domain and reload to continue (ads are what keep it free). Runs only after
 * the LGPD consent is accepted — there's no point gating someone who hasn't
 * opted into ads. Detection relies on a single reliable signal — a DOM "bait"
 * element that cosmetic blockers hide — see {@link detectAdblock}.
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

/**
 * Returns true only when an ad blocker is *clearly* present. Uses a single,
 * reliable signal — a DOM "bait" element with ad-ish class names that blockers
 * (uBlock, AdBlock, AdGuard, Brave…) force to display:none. We deliberately do
 * NOT probe an ad host over the network: ad domains get filtered by ISPs,
 * antivirus and corporate DNS even with no browser blocker, which produced
 * false positives. The bait test has effectively no false positives — a normal
 * browser always renders the element at its given size.
 */
async function detectAdblock(): Promise<boolean> {
  const bait = document.createElement("div");
  bait.className = "adsbox ad-banner ad-placement ads pub_300x250 adsbygoogle banner_ads";
  bait.setAttribute("aria-hidden", "true");
  bait.style.cssText =
    "position:absolute;left:-9999px;top:-9999px;height:12px;width:12px;pointer-events:none;";
  bait.innerHTML = "&nbsp;";
  document.body.appendChild(bait);
  // Give the blocker a moment to apply its cosmetic filters before measuring.
  await new Promise((r) => setTimeout(r, 250));
  const s = getComputedStyle(bait);
  const blocked =
    bait.offsetParent === null ||
    bait.offsetHeight === 0 ||
    bait.clientHeight === 0 ||
    s.display === "none" ||
    s.visibility === "hidden";
  bait.remove();
  return blocked;
}
