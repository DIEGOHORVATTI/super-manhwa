import "server-only";
import { eq } from "drizzle-orm";

import { isAbsolute, isStale } from "@/lib/cache-policy";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { publicUrlFor, putObject, r2Enabled } from "@/lib/r2";

/**
 * Cache-on-read for connector works. The first view of a work persists its
 * merged metadata/chapters to Postgres and mirrors the cover to R2, so repeat
 * visits can be served instantly and survive the upstream source going down.
 *
 * All writes are best-effort and idempotent — failures never affect the live
 * page (callers run these inside `after()`), and a fresh row (<24h) short-
 * circuits the work so we don't re-hit R2 on every visit.
 */
type Core = { title?: string | null; imageUrl?: string | null } & Record<string, unknown>;

export async function cacheWorkOnRead(catalogId: string, core: Core): Promise<void> {
  if (!dbEnabled) return;
  try {
    const db = getDb();
    const { cachedWorks } = schema;
    const [existing] = await db
      .select({ coverR2Key: cachedWorks.coverR2Key, refreshedAt: cachedWorks.refreshedAt })
      .from(cachedWorks)
      .where(eq(cachedWorks.catalogId, catalogId))
      .limit(1);

    const fresh = existing && !isStale(existing.refreshedAt);
    if (fresh && existing.coverR2Key) return; // nothing to do

    // Mirror the cover to R2 once (only for absolute upstream URLs — proxy paths
    // need signing we don't replay here).
    let coverR2Key = existing?.coverR2Key ?? null;
    if (!coverR2Key && r2Enabled && isAbsolute(core.imageUrl)) {
      try {
        const res = await fetch(core.imageUrl);
        if (res.ok) {
          const bytes = new Uint8Array(await res.arrayBuffer());
          const ext = (res.headers.get("content-type")?.split("/")[1] ?? "jpg").replace(
            "jpeg",
            "jpg",
          );
          coverR2Key = await putObject(
            `cache/works/${catalogId}/cover.${ext}`,
            bytes,
            res.headers.get("content-type") ?? "image/jpeg",
          );
        }
      } catch {
        /* cover mirror is best-effort */
      }
    }

    const values = {
      catalogId,
      title: core.title ?? "",
      payloadJson: JSON.stringify(core),
      coverR2Key,
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
 * Read-side fallback: when the live connector/AniList call fails, serve the last
 * cached metadata so a downed source doesn't blank the page. Returns null if
 * nothing is cached.
 */
export async function getCachedWork(
  catalogId: string,
): Promise<{ title: string; core: Core; coverUrl: string | null } | null> {
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
    };
  } catch {
    return null;
  }
}
