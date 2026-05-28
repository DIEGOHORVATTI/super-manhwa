import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@packages/contracts", "@packages/extension-runtime"],
};
export default nextConfig;
