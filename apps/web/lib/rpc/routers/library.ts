import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import * as schema from "@/lib/db/schema";
import { authed } from "../base";

/**
 * Server-backed user library | favorites + "continue reading" progress, the
 * signed-in mirror of the client localStorage store (lib/library.ts). All
 * procedures are `authed`; anonymous users stay on localStorage only. The client
 * dual-writes here on every toggle/open and syncs both ways on login.
 */

const favInput = z.object({
  workId: z.string().min(1).max(256),
  name: z.string().min(1).max(512),
  imageUrl: z.string().max(2048).optional(),
});
const progressInput = z.object({
  workId: z.string().min(1).max(256),
  name: z.string().min(1).max(512),
  imageUrl: z.string().max(2048).optional(),
  chapterId: z.string().min(1).max(256),
  chapterName: z.string().max(512).optional(),
  chapterNo: z.number().int().optional(),
});

export const libraryRouter = {
  /** List the user's favorites, newest first. */
  favorites: authed.handler(async ({ context }) => {
    const { userFavorites } = schema;
    const rows = await context.db
      .select()
      .from(userFavorites)
      .where(eq(userFavorites.userId, context.user.id))
      .orderBy(desc(userFavorites.addedAt));
    return { items: rows };
  }),

  /** Star a work (idempotent). */
  favorite: authed.input(favInput).handler(async ({ input, context }) => {
    const { userFavorites } = schema;
    await context.db
      .insert(userFavorites)
      .values({ userId: context.user.id, ...input, imageUrl: input.imageUrl ?? null })
      .onConflictDoNothing({ target: [userFavorites.userId, userFavorites.workId] });
    return { ok: true };
  }),

  /** Unstar a work. */
  unfavorite: authed
    .input(z.object({ workId: z.string().min(1).max(256) }))
    .handler(async ({ input, context }) => {
      const { userFavorites } = schema;
      await context.db
        .delete(userFavorites)
        .where(
          and(eq(userFavorites.userId, context.user.id), eq(userFavorites.workId, input.workId)),
        );
      return { ok: true };
    }),

  /** Push local favorites into the DB (login migration) and return the merged set. */
  syncFavorites: authed
    .input(z.object({ items: z.array(favInput).max(2000) }))
    .handler(async ({ input, context }) => {
      const { userFavorites } = schema;
      if (input.items.length > 0) {
        await context.db
          .insert(userFavorites)
          .values(
            input.items.map((it) => ({
              userId: context.user.id,
              ...it,
              imageUrl: it.imageUrl ?? null,
            })),
          )
          .onConflictDoNothing({ target: [userFavorites.userId, userFavorites.workId] });
      }
      const rows = await context.db
        .select()
        .from(userFavorites)
        .where(eq(userFavorites.userId, context.user.id))
        .orderBy(desc(userFavorites.addedAt));
      return { items: rows };
    }),

  /** List the user's continue-reading entries, most-recent first. */
  progress: authed.handler(async ({ context }) => {
    const { userProgress } = schema;
    const rows = await context.db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, context.user.id))
      .orderBy(desc(userProgress.updatedAt));
    return { items: rows };
  }),

  /** Upsert the last-opened chapter for a work. */
  recordProgress: authed.input(progressInput).handler(async ({ input, context }) => {
    const { userProgress } = schema;
    const values = {
      userId: context.user.id,
      ...input,
      imageUrl: input.imageUrl ?? null,
      chapterName: input.chapterName ?? null,
      chapterNo: input.chapterNo ?? null,
      updatedAt: new Date(),
    };
    await context.db
      .insert(userProgress)
      .values(values)
      .onConflictDoUpdate({ target: [userProgress.userId, userProgress.workId], set: values });
    return { ok: true };
  }),

  /** Push local history into the DB (login migration) and return the merged set. */
  syncProgress: authed
    .input(z.object({ items: z.array(progressInput).max(500) }))
    .handler(async ({ input, context }) => {
      const { userProgress } = schema;
      for (const it of input.items) {
        const values = {
          userId: context.user.id,
          ...it,
          imageUrl: it.imageUrl ?? null,
          chapterName: it.chapterName ?? null,
          chapterNo: it.chapterNo ?? null,
        };
        await context.db
          .insert(userProgress)
          .values(values)
          .onConflictDoNothing({ target: [userProgress.userId, userProgress.workId] });
      }
      const rows = await context.db
        .select()
        .from(userProgress)
        .where(eq(userProgress.userId, context.user.id))
        .orderBy(desc(userProgress.updatedAt));
      return { items: rows };
    }),

  /** Drop a work from continue-reading. */
  removeProgress: authed
    .input(z.object({ workId: z.string().min(1).max(256) }))
    .handler(async ({ input, context }) => {
      const { userProgress } = schema;
      await context.db
        .delete(userProgress)
        .where(
          and(eq(userProgress.userId, context.user.id), eq(userProgress.workId, input.workId)),
        );
      return { ok: true };
    }),
};
