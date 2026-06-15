import { z } from "zod";

import * as schema from "@/lib/db/schema";
import { syncReadingAchievements } from "@/lib/reading-sync";
import { authed } from "../base";

/**
 * Records that the signed-in user read a chapter (one row per user+chapter), and
 * unlocks reading achievements when thresholds are crossed. Fire-and-forget from
 * the reader; anonymous/unconfigured calls are handled by the `authed` builder.
 */
const trackInput = z.object({
  workId: z.string().min(1).max(256),
  chapterId: z.string().min(1).max(256),
});

export const readingRouter = {
  track: authed.input(trackInput).handler(async ({ input, context }) => {
    const { readingEvents } = schema;
    const inserted = await context.db
      .insert(readingEvents)
      .values({
        userId: context.user.id,
        workId: input.workId,
        chapterId: input.chapterId,
      })
      .onConflictDoNothing()
      .returning({ id: readingEvents.id });

    // Only re-check achievements when this was a genuinely new chapter.
    const unlocked = inserted.length ? await syncReadingAchievements(context.user.id) : [];
    return { ok: true, ...(unlocked.length ? { unlocked } : {}) };
  }),
};
