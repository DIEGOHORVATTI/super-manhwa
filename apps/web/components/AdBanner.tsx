"use client";
import { useAdsConsent } from "@/components/AdsConsent";

/**
 * Adsterra display banner, isolated inside its own iframe.
 *
 * The classic Adsterra banner snippet sets a global `window.atOptions` that the
 * synchronous `invoke.js` reads on load — so two banners on the same page would
 * clobber each other's config. Rendering each banner inside an iframe via
 * `srcDoc` gives every unit its own document scope, sidestepping the collision
 * and keeping the ad's script off the parent page. Renders nothing until the
 * visitor accepts ads (LGPD) or when the slot key is unset (no-op deploy).
 */
export function AdBanner({
  slotKey,
  width,
  height,
}: {
  slotKey?: string;
  width: number;
  height: number;
}) {
  const consent = useAdsConsent();
  if (consent !== "accepted" || !slotKey) return null;

  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>
<script type="text/javascript">atOptions={'key':'${slotKey}','format':'iframe','height':${height},'width':${width},'params':{}};</script>
<script type="text/javascript" src="//www.highperformanceformat.com/${slotKey}/invoke.js"></script>
</body></html>`;

  return (
    <div className="ad-slot" style={{ minHeight: height }} aria-label="Publicidade">
      <span className="ad-head">
        <span className="ad-label">Publicidade</span>
        <span className="ad-disclaimer">
          — ⚠️ Não acredite em bets, promessas de dinheiro fácil são golpe.
        </span>
      </span>
      <iframe
        title="Anúncio"
        srcDoc={srcDoc}
        width={width}
        height={height}
        scrolling="no"
        style={{ border: 0, display: "block", maxWidth: "100%" }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}
