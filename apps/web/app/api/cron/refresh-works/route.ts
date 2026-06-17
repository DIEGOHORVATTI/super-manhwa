import { asc, lte } from "drizzle-orm";
import { NextResponse } from "next/server";

import { cacheChaptersOnRead, cacheWorkOnRead } from "@/lib/cache-works";
import { FRESH_MS } from "@/lib/cache-policy";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { api } from "@/lib/orpc.server";
import { translatePt } from "@/lib/translate";

/**
 * Daily background revalidation for cached connector works (data sovereignty):
 * re-pulls metadata + new chapters for the stalest cached works, re-translates
 * the synopsis and mirrors cover/banner to R2. Native platform works (userWorks)
 * are NOT touched | only the `cachedWorks` catalog mirror. Guarded by CRON_SECRET.
 *
 * ponytail: caps each run at BATCH oldest rows so it stays under the function
 * timeout. Upgrade path if the catalog outgrows one daily batch: page through by
 * `refreshedAt` cursor or shard across multiple cron invocations.
 */
const BATCH = 40;

export async function GET(req: Request) {
  const secret = env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  if (!dbEnabled) return NextResponse.json({ refreshed: 0 });

  const db = getDb();
  const { cachedWorks } = schema;
  const cutoff = new Date(Date.now() - FRESH_MS);

  const due = await db
    .select({ id: cachedWorks.catalogId, title: cachedWorks.title })
    .from(cachedWorks)
    .where(lte(cachedWorks.refreshedAt, cutoff))
    .orderBy(asc(cachedWorks.refreshedAt))
    .limit(BATCH);

  let refreshed = 0;
  for (const w of due) {
    try {
      // AniList `meta` (banner/score) only applies to AniList works (numeric id).
      // Connector-only works have an opaque id | their core comes from the source.
      const isAniList = /^\d+$/.test(w.id);
      const [coreRes, metaRes] = await Promise.all([
        api.manga.core({ id: w.id, name: w.title }),
        isAniList
          ? api.manga
              .meta({ name: w.title })
              .catch(() => ({ meta: {} as { bannerImage?: string; description?: string } }))
          : Promise.resolve({ meta: {} as { bannerImage?: string; description?: string } }),
      ]);
      const core = coreRes.core;
      const descPt = await translatePt(core.description || metaRes.meta.description || "");
      await cacheWorkOnRead(w.id, core, {
        bannerUrl: metaRes.meta.bannerImage ?? null,
        descriptionPt: descPt,
      });
      const ch = await api.manga
        .chapters({ id: w.id, name: w.title })
        .catch(() => ({ chapters: [] }));
      await cacheChaptersOnRead(w.id, ch.chapters);
      refreshed++;
    } catch {
      /* one bad work shouldn't abort the batch */
    }
  }

  return NextResponse.json({ due: due.length, refreshed });
}
