import path from "node:path";
import type { NextConfig } from "next";

// Raiz do monorepo (apps/web -> ../..). O bun hoista o node_modules pra cá, então
// tanto o Turbopack quanto o file-tracing precisam apontar pra raiz | senão o
// build (ex.: `vercel build`, que fixa outputFileTracingRoot em apps/web) não
// resolve o `next`/workspaces. Next 16 exige que os dois valores sejam iguais.
const monorepoRoot = path.join(import.meta.dirname, "..", "..");

// R2 public host (e.g. storage.supermanhwa.com) | catalog-first serves mirrored
// covers/banners straight from R2, so next/image must allow that host. Derived
// from the env so it tracks whatever public domain the bucket is mapped to.
const r2Host = (() => {
  try {
    return new URL(process.env.R2_PUBLIC_URL ?? "").hostname || null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
  transpilePackages: ["@packages/contracts"],
  async redirects() {
    return [{ source: "/manga/:path*", destination: "/", permanent: true }];
  },
  images: {
    // Covers are local, same-origin (`/api/img/<token>?k=<sig>`). Next 16 blocks
    // local images that carry a query string unless a localPattern allows them.
    // Omitting `search` here means "any query string under this path is allowed".
    localPatterns: [{ pathname: "/api/img/**" }],
    // AniList covers imported via the favourites sync are served from AniList's
    // CDN directly (the client can't mint our signed proxy paths).
    remotePatterns: [
      { protocol: "https", hostname: "s4.anilist.co" },
      ...(r2Host ? [{ protocol: "https" as const, hostname: r2Host }] : []),
    ],
  },
};

export default nextConfig;
