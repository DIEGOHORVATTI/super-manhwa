import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Raiz do monorepo (apps/web -> ../..). Evita o Turbopack inferir a raiz
  // errada quando há lockfiles em diretórios pai (ex.: ~/bun.lock).
  turbopack: {
    root: path.join(import.meta.dirname, "..", ".."),
  },
  transpilePackages: ["@packages/contracts", "@packages/extension-runtime"],
  images: {
    // Covers are local, same-origin (`/api/img/<token>?k=<sig>`). Next 16 blocks
    // local images that carry a query string unless a localPattern allows them.
    // Omitting `search` here means "any query string under this path is allowed".
    localPatterns: [{ pathname: "/api/img/**" }],
    // AniList covers imported via the favourites sync are served from AniList's
    // CDN directly (the client can't mint our signed proxy paths).
    remotePatterns: [{ protocol: "https", hostname: "s4.anilist.co" }],
  },
};

export default nextConfig;
