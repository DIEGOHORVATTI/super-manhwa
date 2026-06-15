"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { markDownloaded, unmarkDownloaded, useIsDownloaded } from "@/lib/library";

// Must match the cache name the service worker serves images from (public/sw.js).
const IMG_CACHE = "mr-images-v1";

/**
 * Pre-caches the current chapter's page images into the SW image cache so it can
 * be read offline, and tracks the "downloaded" state locally. No-op if the Cache
 * API isn't available.
 */
export function DownloadChapterButton({
  pages,
  chapterId,
}: {
  pages: string[];
  chapterId: string;
}) {
  const downloaded = useIsDownloaded(chapterId);
  const [busy, setBusy] = useState(false);
  // The Cache API is browser-only, so the server always renders nothing here.
  // Gate on mount so the client's first paint matches that (null) and only then
  // reveals the button | otherwise hydration mismatches on the reader toolbar.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || pages.length === 0 || typeof caches === "undefined") return null;

  const onClick = async () => {
    if (downloaded) {
      // Best-effort cleanup; the local flag is what the UI reads.
      try {
        const cache = await caches.open(IMG_CACHE);
        await Promise.all(pages.map((p) => cache.delete(p)));
      } catch {}
      unmarkDownloaded(chapterId);
      return;
    }
    setBusy(true);
    try {
      const cache = await caches.open(IMG_CACHE);
      await cache.addAll(pages);
      markDownloaded(chapterId);
    } catch {
      /* quota / offline | leave it un-downloaded */
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`download-btn${downloaded ? " is-done" : ""}`}
      onClick={onClick}
      disabled={busy}
      aria-pressed={downloaded}
    >
      <Icon name={downloaded ? "circle-check-big" : "download"} size={15} />
      {busy ? "Baixando…" : downloaded ? "Baixado (offline)" : "Baixar p/ ler offline"}
    </button>
  );
}
