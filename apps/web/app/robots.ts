import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  return {
    // Reader and opaque image tokens shouldn't be crawled/indexed.
    rules: { userAgent: "*", allow: "/", disallow: ["/read", "/i/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
