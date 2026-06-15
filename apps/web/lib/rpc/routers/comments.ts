import { ORPCError } from "@orpc/server";
import {
  commentCreateSchema,
  commentEditSchema,
  targetTypeSchema,
  voteSchema,
} from "@packages/contracts";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import * as schema from "@/lib/db/schema";
import { hasRole } from "@/lib/roles";
import { authed, base } from "../base";

const idInput = z.object({ id: z.number().int().positive() });

/**
 * Native comment threads (replaces Disqus). A comment targets a work or chapter
 * keyed by the opaque catalog id used in routes; threads are one level deep.
 * List is public and degrades to empty without a DB; everything else needs auth.
 */
export const commentsRouter = {
  list: base
    .input(z.object({ targetType: targetTypeSchema, targetId: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      if (!context.db) return { comments: [], meId: null };
      const { comments, user } = schema;
      const rows = await context.db
        .select({
          id: comments.id,
          parentId: comments.parentId,
          body: comments.body,
          score: comments.score,
          createdAt: comments.createdAt,
          editedAt: comments.editedAt,
          deletedAt: comments.deletedAt,
          userId: comments.userId,
          authorName: user.name,
          authorImage: user.image,
          authorHandle: user.handle,
          authorRole: user.role,
          authorPlan: user.plan,
        })
        .from(comments)
        .leftJoin(user, eq(comments.userId, user.id))
        .where(
          and(eq(comments.targetType, input.targetType), eq(comments.targetId, input.targetId)),
        )
        .orderBy(desc(comments.createdAt))
        .limit(500);

      const meId = context.session?.user?.id ?? null;
      // Hide bodies of soft-deleted comments but keep them so replies don't orphan.
      const list = rows.map((r) => ({
        ...r,
        body: r.deletedAt ? null : r.body,
        mine: meId != null && r.userId === meId,
      }));
      return { comments: list, meId };
    }),

  create: authed.input(commentCreateSchema).handler(async ({ input, context }) => {
    const { comments } = schema;
    const [row] = await context.db
      .insert(comments)
      .values({
        userId: context.user.id,
        targetType: input.targetType,
        targetId: input.targetId,
        parentId: input.parentId ?? null,
        body: input.body,
      })
      .returning();
    return { comment: row };
  }),

  edit: authed
    .input(commentEditSchema.extend({ id: z.number().int().positive() }))
    .handler(async ({ input, context }) => {
      const { comments } = schema;
      const [row] = await context.db
        .select()
        .from(comments)
        .where(eq(comments.id, input.id))
        .limit(1);
      if (!row || row.deletedAt) throw new ORPCError("NOT_FOUND");
      if (row.userId !== context.user.id) throw new ORPCError("FORBIDDEN");

      const [updated] = await context.db
        .update(comments)
        .set({ body: input.body, editedAt: new Date() })
        .where(eq(comments.id, input.id))
        .returning();
      return { comment: updated };
    }),

  remove: authed.input(idInput).handler(async ({ input, context }) => {
    const { comments } = schema;
    const [row] = await context.db
      .select()
      .from(comments)
      .where(eq(comments.id, input.id))
      .limit(1);
    if (!row) throw new ORPCError("NOT_FOUND");

    const isOwner = row.userId === context.user.id;
    const isMod = hasRole(context.user, "staff");
    if (!isOwner && !isMod) throw new ORPCError("FORBIDDEN");

    await context.db
      .update(comments)
      .set({ deletedAt: new Date() })
      .where(eq(comments.id, input.id));
    return { ok: true };
  }),

  vote: authed
    .input(voteSchema.extend({ id: z.number().int().positive() }))
    .handler(async ({ input, context }) => {
      const { commentVotes, comments } = schema;
      const userId = context.user.id;
      if (input.value === 0) {
        await context.db
          .delete(commentVotes)
          .where(and(eq(commentVotes.commentId, input.id), eq(commentVotes.userId, userId)));
      } else {
        await context.db
          .insert(commentVotes)
          .values({ commentId: input.id, userId, value: input.value })
          .onConflictDoUpdate({
            target: [commentVotes.commentId, commentVotes.userId],
            set: { value: input.value },
          });
      }
      const [{ score }] = await context.db
        .select({ score: sql<number>`coalesce(sum(${commentVotes.value}), 0)` })
        .from(commentVotes)
        .where(eq(commentVotes.commentId, input.id));
      await context.db
        .update(comments)
        .set({ score: Number(score) })
        .where(eq(comments.id, input.id));
      return { score: Number(score), value: input.value };
    }),
};
