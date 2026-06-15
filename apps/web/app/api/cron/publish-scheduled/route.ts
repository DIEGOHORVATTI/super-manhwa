import { and, eq, lte } from "drizzle-orm";
import { env } from "@/lib/env";
import { NextResponse } from "next/server";

import { dbEnabled, getDb, schema } from "@/lib/db";

/**
 * Publishes chapters whose scheduled time has arrived. Wired to a Vercel Cron
 * (e.g. every 5 min) and guarded by `CRON_SECRET` like the newsletter cron.
 */
export async function GET(req: Request) {
  const secret = env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  if (!dbEnabled) return NextResponse.json({ published: 0 });

  const db = getDb();
  const { userChapters, userWorks } = schema;
  const now = new Date();

  const due = await db
    .select({ id: userChapters.id, workId: userChapters.workId })
    .from(userChapters)
    .where(and(eq(userChapters.status, "scheduled"), lte(userChapters.scheduledAt, now)));

  for (const ch of due) {
    await db
      .update(userChapters)
      .set({ status: "published", publishedAt: now, scheduledAt: null })
      .where(eq(userChapters.id, ch.id));
    await db.update(userWorks).set({ status: "published" }).where(eq(userWorks.id, ch.workId));
  }

  return NextResponse.json({ published: due.length });
}
