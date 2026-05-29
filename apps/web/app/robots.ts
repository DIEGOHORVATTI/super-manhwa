import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  return {
    // Reader, the local library and the API/image proxy shouldn't be crawled.
    rules: { userAgent: "*", allow: "/", disallow: ["/read", "/api/", "/auth/", "/biblioteca"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
