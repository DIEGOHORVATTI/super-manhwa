import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";

export default function robots(): MetadataRoute.Robots {
  const base = env.SITE_URL ?? "http://localhost:3000";
  return {
    // Reader, the local library and the API/image proxy shouldn't be crawled.
    rules: {
      userAgent: "*",
      allow: routes.home,
      disallow: ["/read", "/api/", "/auth/", routes.library],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
