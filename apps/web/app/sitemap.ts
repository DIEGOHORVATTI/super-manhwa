import type { MetadataRoute } from "next";

import { browseNovels, getGenres } from "@/lib/catalog";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";

// Regenerated at most once a day | the catalog changes slowly and each listing
// page is an HTML fetch from Central Novel.
export const revalidate = 86400;

/** Safety bound for walking the A-Z listing (20 novels per page). */
const MAX_PAGES = 60;

async function allNovelSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await browseNovels({ sort: "title", page }).catch(() => null);
    if (!result?.list.length) break;
    slugs.push(...result.list.map((novel) => novel.slug));
    if (!result.hasNextPage) break;
  }
  return [...new Set(slugs)];
}

/**
 * Static routes, every genre page and every novel. Best-effort: when Central
 * Novel is unreachable (e.g. at build time) the static entries still ship.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.SITE_URL ?? "http://localhost:3000";
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    ...[
      routes.about,
      routes.contact,
      routes.dmca,
      routes.terms,
      routes.privacy,
      routes.cookies,
    ].map((path) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
  ];

  const [genres, slugs] = await Promise.all([getGenres().catch(() => []), allNovelSlugs()]);

  return [
    ...staticEntries,
    ...genres.map((genre) => ({
      url: `${base}${routes.genre(genre.slug)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...slugs.map((slug) => ({
      url: `${base}${routes.novel(slug)}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
