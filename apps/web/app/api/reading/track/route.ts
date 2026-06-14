import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { syncReadingAchievements } from "@/lib/reading-sync";

/**
 * Records that the signed-in user read a chapter (one row per user+chapter), and
 * unlocks reading achievements when thresholds are crossed. Fire-and-forget from
 * the reader; anonymous/unconfigured calls no-op quietly.
 */
const TrackSchema = z.object({
  workId: z.string().min(1).max(256),
  chapterId: z.string().min(1).max(256),
});

export async function POST(req: Request) {
  if (!dbEnabled) return NextResponse.json({ ok: false });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = TrackSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = getDb();
  const { readingEvents } = schema;
  const inserted = await db
    .insert(readingEvents)
    .values({
      userId: session.user.id,
      workId: parsed.data.workId,
      chapterId: parsed.data.chapterId,
    })
    .onConflictDoNothing()
    .returning({ id: readingEvents.id });

  // Only re-check achievements when this was a genuinely new chapter.
  const unlocked = inserted.length ? await syncReadingAchievements(session.user.id) : [];
  return NextResponse.json({ ok: true, ...(unlocked.length ? { unlocked } : {}) });
}
