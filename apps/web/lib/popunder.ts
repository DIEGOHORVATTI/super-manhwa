/**
 * Popunder (Adsterra Direct Link) — the most aggressive ad format, so it's
 * fully opt-in and rate-limited. Unset the env var to disable it entirely
 * (the global click handler becomes a no-op). The link is a single Adsterra
 * "Direct Link" smartlink that rotates advertisers server-side.
 */
export const POPUNDER_DIRECT_LINK = process.env.NEXT_PUBLIC_ADSTERRA_DIRECT_LINK;

const STORAGE_KEY = "popunder-last";

/**
 * One popunder per visitor per window. Aggressive monetization still has to
 * leave reading usable — firing on every chapter click would be unbearable, so
 * we cap it to once every 12h per browser.
 */
const INTERVAL_MS = 12 * 60 * 60 * 1000;

/** True when a popunder is enabled and the frequency cap has elapsed. */
export function popunderReady(): boolean {
  if (!POPUNDER_DIRECT_LINK) return false;
  try {
    const last = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    return Date.now() - last > INTERVAL_MS;
  } catch {
    return false;
  }
}

/** Stamp "fired now" so the cap holds until the interval passes. */
export function markPopunderFired() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* localStorage unavailable — skip the cap, the open already happened */
  }
}
