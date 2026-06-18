import "server-only";
import type { Chapter } from "@packages/contracts";
import { desc, eq } from "drizzle-orm";

import { workCacheUpToDate } from "@/lib/cache-policy";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { publicUrlFor, putObject, r2Enabled } from "@/lib/r2";

/**
 * Cache-on-read for connector works. The first view of a work persists its
 * merged metadata/chapters to Postgres and mirrors the cover to R2, so repeat
 * visits can be served instantly and survive the upstream source going down.
 *
 * All writes are best-effort and idempotent | failures never affect the live
 * page (callers run these inside `after()`), and a fresh row (<24h) short-
 * circuits the work so we don't re-hit R2 on every visit.
 */
type Core = { title?: string | null; imageUrl?: string | null } & Record<string, unknown>;
type CacheOpts = { bannerUrl?: string | null; descriptionPt?: string | null };

/**
 * Mirror one cover/banner image to R2 (best-effort). Accepts an absolute upstream
 * URL (connector covers, AniList banners) OR our own signed proxy path
 * (`/api/img/<token>?k=` | AniList covers), which is fetched through our origin so
 * the backend resolves + signs it. Returns the R2 key or null.
 * ponytail: a proxy-path mirror does a self-origin round trip; runs in `after()`
 * so it never delays the page. Upgrade path: decode the token to the raw upstream
 * URL backend-side if the self-call ever becomes a bottleneck.
 */
async function mirror(catalogId: string, kind: string, url: unknown): Promise<string | null> {
  if (!r2Enabled || typeof url !== "string" || !url) return null;
  const fetchUrl = /^https?:\/\//i.test(url)
    ? url
    : url.startsWith("/api/img/") && env.SITE_URL
      ? `${env.SITE_URL}${url}`
      : null;
  if (!fetchUrl) return null;
  try {
    const res = await fetch(fetchUrl);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const type = res.headers.get("content-type") ?? "image/jpeg";
    const ext = (type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
    return await putObject(`cache/works/${catalogId}/${kind}.${ext}`, bytes, type);
  } catch {
    return null; // image mirror is best-effort
  }
}

export async function cacheWorkOnRead(
  catalogId: string,
  core: Core,
  opts: CacheOpts = {},
): Promise<void> {
  if (!dbEnabled) return;
  try {
    const db = getDb();
    const { cachedWorks } = schema;
    const [existing] = await db
      .select({
        coverR2Key: cachedWorks.coverR2Key,
        bannerR2Key: cachedWorks.bannerR2Key,
        refreshedAt: cachedWorks.refreshedAt,
      })
      .from(cachedWorks)
      .where(eq(cachedWorks.catalogId, catalogId))
      .limit(1);

    // Fresh row with both images already mirrored (or no banner to mirror) → nothing to do.
    if (workCacheUpToDate(existing, opts.bannerUrl)) return;

    // Mirror cover + banner to R2 once each (only absolute upstream URLs | proxy
    // paths need signing we don't replay here).
    const coverR2Key = existing?.coverR2Key ?? (await mirror(catalogId, "cover", core.imageUrl));
    const bannerR2Key =
      existing?.bannerR2Key ?? (await mirror(catalogId, "banner", opts.bannerUrl));

    const values = {
      catalogId,
      title: core.title ?? "",
      // descriptionPt persists the translated synopsis so a downed translate proxy
      // (or source) still serves pt-br from cache.
      payloadJson: JSON.stringify({ ...core, descriptionPt: opts.descriptionPt ?? null }),
      coverR2Key,
      bannerR2Key,
      refreshedAt: new Date(),
    };
    await db
      .insert(cachedWorks)
      .values(values)
      .onConflictDoUpdate({ target: cachedWorks.catalogId, set: values });
  } catch {
    /* never let caching break a page render */
  }
}

/** Persist the merged chapter list for a work (idempotent per chapterKey). */
export async function cacheChaptersOnRead(
  catalogId: string,
  chapters: Array<{ id: string } & Record<string, unknown>>,
): Promise<void> {
  if (!dbEnabled || chapters.length === 0) return;
  try {
    const db = getDb();
    const { cachedChapters } = schema;
    for (const ch of chapters) {
      const values = {
        catalogId,
        chapterKey: ch.id,
        payloadJson: JSON.stringify(ch),
        refreshedAt: new Date(),
      };
      await db
        .insert(cachedChapters)
        .values(values)
        .onConflictDoUpdate({
          target: [cachedChapters.catalogId, cachedChapters.chapterKey],
          set: values,
        });
    }
  } catch {
    /* best-effort */
  }
}

/**
 * Read a novel chapter's prose from our DB (the on-demand persisted copy).
 * Returns null when not yet cached | the caller then fetches from the source.
 */
export async function getCachedNovelChapter(
  chapterId: string,
): Promise<{ html: string; title: string | null } | null> {
  if (!dbEnabled) return null;
  try {
    const db = getDb();
    const { cachedNovelChapters } = schema;
    const [row] = await db
      .select()
      .from(cachedNovelChapters)
      .where(eq(cachedNovelChapters.chapterId, chapterId))
      .limit(1);
    return row ? { html: row.contentHtml, title: row.title } : null;
  } catch {
    return null;
  }
}

/**
 * Persist a novel chapter's prose on first read (idempotent per chapterId).
 * `html` MUST already be sanitized by the caller | we never store raw source markup.
 */
export async function cacheNovelChapterOnRead(
  chapterId: string,
  html: string,
  opts: { workId?: string | null; title?: string | null } = {},
): Promise<void> {
  if (!dbEnabled || !html) return;
  try {
    const db = getDb();
    const { cachedNovelChapters } = schema;
    const values = {
      chapterId,
      workId: opts.workId ?? null,
      title: opts.title ?? null,
      contentHtml: html,
      refreshedAt: new Date(),
    };
    await db
      .insert(cachedNovelChapters)
      .values(values)
      .onConflictDoUpdate({ target: cachedNovelChapters.chapterId, set: values });
  } catch {
    /* best-effort | never block the reader */
  }
}

/**
 * Catalog-first read: serve a work's last cached metadata straight from our DB
 * (title, core payload incl. translated synopsis, R2 cover/banner). The detail
 * page renders from this when fresh (instant, no backend hit) and falls back to
 * it when the live source is down. `refreshedAt` lets the caller decide freshness.
 * Returns null if nothing is cached.
 */
export async function getCachedWork(catalogId: string): Promise<{
  title: string;
  core: Core;
  coverUrl: string | null;
  bannerUrl: string | null;
  refreshedAt: Date;
} | null> {
  if (!dbEnabled) return null;
  try {
    const db = getDb();
    const { cachedWorks } = schema;
    const [row] = await db
      .select()
      .from(cachedWorks)
      .where(eq(cachedWorks.catalogId, catalogId))
      .limit(1);
    if (!row) return null;
    return {
      title: row.title,
      core: JSON.parse(row.payloadJson) as Core,
      coverUrl: row.coverR2Key ? publicUrlFor(row.coverR2Key) : null,
      bannerUrl: row.bannerR2Key ? publicUrlFor(row.bannerR2Key) : null,
      refreshedAt: row.refreshedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Catalog-first read for chapters: the merged list we last persisted for a work,
 * newest-cached first. Lets the detail page paint chapters instantly without the
 * cross-source fan-out. Returns null if nothing is cached.
 */
export async function getCachedChapters(
  catalogId: string,
): Promise<{ chapters: Chapter[]; refreshedAt: Date } | null> {
  if (!dbEnabled) return null;
  try {
    const db = getDb();
    const { cachedChapters } = schema;
    const rows = await db
      .select()
      .from(cachedChapters)
      .where(eq(cachedChapters.catalogId, catalogId))
      .orderBy(desc(cachedChapters.refreshedAt));
    if (rows.length === 0) return null;
    return {
      chapters: rows.map((r) => JSON.parse(r.payloadJson) as Chapter),
      refreshedAt: rows[0].refreshedAt,
    };
  } catch {
    return null;
  }
}
