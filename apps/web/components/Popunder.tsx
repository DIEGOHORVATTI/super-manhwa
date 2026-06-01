"use client";
import { useEffect } from "react";
import { useAdsConsent } from "@/components/AdsConsent";
import { markPopunderFired, POPUNDER_DIRECT_LINK, popunderReady } from "@/lib/popunder";

/**
 * Chapter-click popunder. A single capture-phase click listener watches for
 * plain left-clicks on any chapter link (`a[href^="/read/"]` — covers the
 * chapter list and the reader's prev/next). When the frequency cap allows, it
 * performs the popunder swap: the chapter opens in a new foreground tab (our
 * reader, on top) while the current tab navigates to the advertiser link (slips
 * underneath). Renders nothing; stays a no-op until ads are accepted (LGPD) and
 * a Direct Link is configured.
 */
export function Popunder() {
  const consent = useAdsConsent();

  useEffect(() => {
    if (consent !== "accepted" || !POPUNDER_DIRECT_LINK) return;

    const onClick = (e: MouseEvent) => {
      // Only hijack a plain left-click — modified / middle clicks (open-in-tab)
      // and already-handled events keep their normal behavior.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const link = (e.target as HTMLElement)?.closest?.(
        'a[href^="/read/"]',
      ) as HTMLAnchorElement | null;
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || !popunderReady()) return;

      // Swap: new foreground tab gets the chapter (on top); this tab goes to the
      // ad (underneath). Both happen inside the user gesture so neither is blocked.
      e.preventDefault();
      e.stopPropagation();
      markPopunderFired();
      window.open(href, "_blank");
      window.location.href = POPUNDER_DIRECT_LINK as string;
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [consent]);

  return null;
}
