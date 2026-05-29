import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@packages/contracts", "@packages/extension-runtime"],
  images: {
    // Covers are local, same-origin (`/api/img/<token>?k=<sig>`). Next 16 blocks
    // local images that carry a query string unless a localPattern allows them.
    // Omitting `search` here means "any query string under this path is allowed".
    localPatterns: [{ pathname: "/api/img/**" }],
  },
};
export default nextConfig;
