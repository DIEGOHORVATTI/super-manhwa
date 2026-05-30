import type { MetadataRoute } from "next";
import { api } from "@/lib/orpc.server";

// Regenerated at most once a day — the catalog is large and changes slowly, and
// we don't want to hammer the backend per crawl.
export const revalidate = 86400;

const slugifyGenre = (g: string) =>
  g
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Dynamic sitemap: home + Explorar, every genre page, and a bounded slice of the
 * most popular works. Best-effort — if the backend is unreachable (e.g. at build
 * time) we still emit the static entries rather than failing the build.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/explorar`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/atualizacoes`, lastModified: now, changeFrequency: "hourly", priority: 0.7 },
    ...["/about", "/contact", "/dmca", "/terms", "/privacy", "/cookies"].map((p) => ({
      url: `${base}${p}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
  ];

  const [genresRes, popular, trending] = await Promise.all([
    api.manga.genres({ lang: "pt-br" }).catch(() => ({ genres: [] })),
    api.manga.popular({ lang: "pt-br", sort: "popular", page: 1 }).catch(() => ({ list: [] })),
    api.manga.popular({ lang: "pt-br", sort: "trending", page: 1 }).catch(() => ({ list: [] })),
  ]);

  for (const g of genresRes.genres) {
    entries.push({
      url: `${base}/g/${slugifyGenre(g)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  const seen = new Set<string>();
  for (const m of [...popular.list, ...trending.list]) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    entries.push({
      url: `${base}/manga/${m.id}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}
