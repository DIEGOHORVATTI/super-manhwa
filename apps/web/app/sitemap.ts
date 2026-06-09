import type { MetadataRoute } from "next";
import { api } from "@/lib/orpc.server";
import { slugify } from "@/lib/slug";

// Regenerated at most once a day — the catalog is large and changes slowly, and
// we don't want to hammer the backend per crawl.
export const revalidate = 86400;

const slugifyGenre = (g: string) =>
  g
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Safety bound: never page a single ranking deeper than this (≈ thousands of works). */
const MAX_PAGES = 60;

/**
 * Walk one ranking to exhaustion (or the page cap), yielding every work. Stops as
 * soon as a page is empty or the source reports no next page — so short rankings
 * cost only the pages they actually have. Best-effort: a failing page ends the walk.
 */
async function pageThrough(
  sort: "popular" | "trending" | "newest",
): Promise<{ id: string; name: string }[]> {
  const out: { id: string; name: string }[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await api.manga
      .popular({ lang: "pt-br", sort, page })
      .catch(() => ({ list: [] as { id: string; name: string }[], hasNextPage: false }));
    if (!res.list.length) break;
    out.push(...res.list);
    if (!("hasNextPage" in res) || !res.hasNextPage) break;
  }
  return out;
}

/**
 * Dynamic sitemap: static routes, every genre page, and every work the catalog
 * exposes across the popular/trending/newest rankings (deduped). Work URLs carry
 * the keyword-rich slug so Google indexes them under their title. Best-effort —
 * if the backend is unreachable (e.g. at build time) we still emit the static
 * entries rather than failing the build.
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

  const [genresRes, popular, trending, newest] = await Promise.all([
    api.manga.genres({ lang: "pt-br" }).catch(() => ({ genres: [] })),
    pageThrough("popular"),
    pageThrough("trending"),
    pageThrough("newest"),
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
  for (const m of [...popular, ...trending, ...newest]) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    entries.push({
      url: `${base}/manga/${m.id}/${slugify(m.name)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}
