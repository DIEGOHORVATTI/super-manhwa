/**
 * Adsterra slot keys, read from public env vars so they can be rotated or
 * disabled without a code change. Any unset key makes its slot a no-op (the ad
 * component renders nothing), so the code can ship before the keys exist.
 * NEXT_PUBLIC_* must be referenced statically for Next.js to inline them.
 */
export const adKeys = {
  banner728x90: process.env.NEXT_PUBLIC_ADSTERRA_BANNER_728x90,
  banner300x250: process.env.NEXT_PUBLIC_ADSTERRA_BANNER_300x250,
  // Full invoke.js URL (host varies per publisher), not a bare key.
  nativeSrc: process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_SRC,
} as const;
