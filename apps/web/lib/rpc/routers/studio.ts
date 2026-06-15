import { ORPCError } from "@orpc/server";
import {
  chapterActionSchema,
  reviewSchema,
  slugifyWork,
  teamAddSchema,
  textChapterCreateSchema,
  workCreateSchema,
  workEditSchema,
} from "@packages/contracts";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import * as schema from "@/lib/db/schema";
import { persistChapterText } from "@/lib/learning/persist-chapter";
import type { LearnLanguage } from "@/lib/learning/tokenize";
import { getWorkAccess } from "@/lib/perms";
import { authed } from "../base";

const workIdInput = z.object({ id: z.number().int().positive() });

/**
 * Studio (user-works) authoring surface, ported from the Next route handlers.
 * Everything requires auth (`authed`); finer access is enforced per-procedure
 * via `getWorkAccess(workId, user.id)`. Image/cover/page uploads stay as native
 * multipart route handlers | only the JSON operations live here.
 *
 * Shape:
 *   works:    { list, create }
 *   work:     { get, update, remove }
 *   team:     { add, remove }
 *   chapter:  { action, review }
 *   textChapter: { add }
 */
export const studioRouter = {
  works: {
    /** List the works I own or collaborate on. */
    list: authed.handler(async ({ context }) => {
      const { userWorks, teamMembers } = schema;
      const userId = context.user.id;

      const teamIds = (
        await context.db
          .select({ teamId: teamMembers.teamId })
          .from(teamMembers)
          .where(eq(teamMembers.userId, userId))
      ).map((r) => r.teamId);

      const owned = await context.db
        .select({
          id: userWorks.id,
          title: userWorks.title,
          slug: userWorks.slug,
          status: userWorks.status,
        })
        .from(userWorks)
        .where(eq(userWorks.ownerId, userId))
        .orderBy(desc(userWorks.createdAt));

      const collab = teamIds.length
        ? await context.db
            .select({
              id: userWorks.id,
              title: userWorks.title,
              slug: userWorks.slug,
              status: userWorks.status,
            })
            .from(userWorks)
            .where(inArray(userWorks.teamId, teamIds))
        : [];

      // Dedupe (an owned work also has the owner in its team).
      const map = new Map<number, (typeof owned)[number]>();
      for (const w of [...owned, ...collab]) map.set(w.id, w);
      return { works: [...map.values()] };
    }),

    /** Create a new work plus its backing team. */
    create: authed.input(workCreateSchema).handler(async ({ input, context }) => {
      const { userWorks, teams, teamMembers } = schema;
      const userId = context.user.id;

      // A team backs every work so collaborators can be added with roles.
      const [team] = await context.db
        .insert(teams)
        .values({ name: `${input.title} | equipe`, ownerId: userId })
        .returning({ id: teams.id });
      await context.db.insert(teamMembers).values({ teamId: team.id, userId, role: "owner" });

      const slug = `${slugifyWork(input.title)}-${team.id}`; // team id keeps slugs unique
      const [work] = await context.db
        .insert(userWorks)
        .values({
          ownerId: userId,
          teamId: team.id,
          title: input.title,
          slug,
          synopsis: input.synopsis ?? null,
          status: "draft",
          kind: input.kind,
          language: input.kind === "novel" ? (input.language ?? null) : null,
          categories: input.categories ?? null,
        })
        .returning({ id: userWorks.id, slug: userWorks.slug });

      return { work };
    }),
  },

  work: {
    /** Work detail: metadata + chapters + team + the caller's access. */
    get: authed.input(workIdInput).handler(async ({ input, context }) => {
      const access = await getWorkAccess(input.id, context.user.id);
      if (!access.role) throw new ORPCError("FORBIDDEN");

      const { userWorks, userChapters, teamMembers, user } = schema;
      const [work] = await context.db
        .select()
        .from(userWorks)
        .where(eq(userWorks.id, input.id))
        .limit(1);
      const chapters = await context.db
        .select({
          id: userChapters.id,
          number: userChapters.number,
          title: userChapters.title,
          status: userChapters.status,
          scheduledAt: userChapters.scheduledAt,
          publishedAt: userChapters.publishedAt,
        })
        .from(userChapters)
        .where(eq(userChapters.workId, input.id))
        .orderBy(asc(userChapters.number));

      const members = work.teamId
        ? await context.db
            .select({
              userId: teamMembers.userId,
              role: teamMembers.role,
              name: user.name,
              handle: user.handle,
            })
            .from(teamMembers)
            .leftJoin(user, eq(teamMembers.userId, user.id))
            .where(eq(teamMembers.teamId, work.teamId))
        : [];

      return { work, chapters, members, access };
    }),

    /** Edit work metadata (canEditWork: owner/editor). */
    update: authed
      .input(workEditSchema.extend({ id: z.number().int().positive() }))
      .handler(async ({ input, context }) => {
        const { id, ...patch } = input;
        const access = await getWorkAccess(id, context.user.id);
        if (!access.canEditWork) throw new ORPCError("FORBIDDEN");

        const { userWorks } = schema;
        const [updated] = await context.db
          .update(userWorks)
          .set(patch)
          .where(eq(userWorks.id, id))
          .returning();
        return { work: updated };
      }),

    /** Delete a work (owner only). */
    remove: authed.input(workIdInput).handler(async ({ input, context }) => {
      const access = await getWorkAccess(input.id, context.user.id);
      if (!access.isOwner) throw new ORPCError("FORBIDDEN");

      const { userWorks } = schema;
      await context.db.delete(userWorks).where(eq(userWorks.id, input.id));
      return { ok: true };
    }),
  },

  team: {
    /** Add/update a team member by @handle (canManageTeam: owner). */
    add: authed
      .input(teamAddSchema.extend({ id: z.number().int().positive() }))
      .handler(async ({ input, context }) => {
        const access = await getWorkAccess(input.id, context.user.id);
        if (!access.canManageTeam) throw new ORPCError("FORBIDDEN");

        const { userWorks, teamMembers, user } = schema;
        const [work] = await context.db
          .select({ teamId: userWorks.teamId })
          .from(userWorks)
          .where(eq(userWorks.id, input.id))
          .limit(1);
        if (!work?.teamId) throw new ORPCError("BAD_REQUEST", { message: "Obra sem equipe." });

        const [target] = await context.db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.handle, input.handle))
          .limit(1);
        if (!target) throw new ORPCError("NOT_FOUND", { message: "Usuário não encontrado." });

        await context.db
          .insert(teamMembers)
          .values({ teamId: work.teamId, userId: target.id, role: input.role })
          .onConflictDoUpdate({
            target: [teamMembers.teamId, teamMembers.userId],
            set: { role: input.role },
          });
        return { ok: true };
      }),

    /** Remove a team member (canManageTeam: owner; cannot remove the owner). */
    remove: authed
      .input(z.object({ id: z.number().int().positive(), userId: z.string() }))
      .handler(async ({ input, context }) => {
        const access = await getWorkAccess(input.id, context.user.id);
        if (!access.canManageTeam) throw new ORPCError("FORBIDDEN");

        const { userWorks, teamMembers } = schema;
        const [work] = await context.db
          .select({ teamId: userWorks.teamId, ownerId: userWorks.ownerId })
          .from(userWorks)
          .where(eq(userWorks.id, input.id))
          .limit(1);
        if (!work?.teamId) throw new ORPCError("BAD_REQUEST", { message: "Obra sem equipe." });
        if (work.ownerId === input.userId) {
          throw new ORPCError("BAD_REQUEST", { message: "Não é possível remover o dono." });
        }

        await context.db
          .delete(teamMembers)
          .where(and(eq(teamMembers.teamId, work.teamId), eq(teamMembers.userId, input.userId)));
        return { ok: true };
      }),
  },

  chapter: {
    /**
     * Lifecycle transition for a chapter. submit needs canEditChapters; every
     * other action needs canPublish (editor/owner). Publishing flips the parent
     * work to "published".
     */
    action: authed
      .input(chapterActionSchema.extend({ id: z.number().int().positive() }))
      .handler(async ({ input, context }) => {
        const { userChapters, userWorks } = schema;
        const [chapter] = await context.db
          .select()
          .from(userChapters)
          .where(eq(userChapters.id, input.id))
          .limit(1);
        if (!chapter) throw new ORPCError("NOT_FOUND");

        const access = await getWorkAccess(chapter.workId, context.user.id);
        const { action } = input;
        const canSubmit = access.canEditChapters;
        const canManage = access.canPublish; // editor/owner
        if (action === "submit" && !canSubmit) throw new ORPCError("FORBIDDEN");
        if (action !== "submit" && !canManage) throw new ORPCError("FORBIDDEN");

        const now = new Date();
        const set: Partial<typeof userChapters.$inferInsert> = {};
        if (input.number) set.number = input.number;
        if (input.title !== undefined) set.title = input.title;

        if (action === "submit") set.status = "in_review";
        else if (action === "schedule") {
          if (!input.scheduledAt) throw new ORPCError("BAD_REQUEST", { message: "needs_date" });
          set.status = "scheduled";
          set.scheduledAt = new Date(input.scheduledAt);
        } else if (action === "publish") {
          set.status = "published";
          set.publishedAt = now;
          set.scheduledAt = null;
        } else if (action === "unpublish") {
          set.status = "draft";
          set.publishedAt = null;
        }

        const [updated] = await context.db
          .update(userChapters)
          .set(set)
          .where(eq(userChapters.id, input.id))
          .returning();

        if (action === "publish") {
          await context.db
            .update(userWorks)
            .set({ status: "published" })
            .where(eq(userWorks.id, chapter.workId));
        }
        return { chapter: updated };
      }),

    /**
     * Submit a review decision (canReview: reviewer/editor/owner). "approved"
     * stamps reviewedBy; "changes_requested" sends back to draft with a note.
     */
    review: authed
      .input(reviewSchema.extend({ id: z.number().int().positive() }))
      .handler(async ({ input, context }) => {
        const { userChapters, chapterReviews } = schema;
        const [chapter] = await context.db
          .select()
          .from(userChapters)
          .where(eq(userChapters.id, input.id))
          .limit(1);
        if (!chapter) throw new ORPCError("NOT_FOUND");

        const access = await getWorkAccess(chapter.workId, context.user.id);
        if (!access.canReview) throw new ORPCError("FORBIDDEN");

        await context.db.insert(chapterReviews).values({
          chapterId: input.id,
          reviewerId: context.user.id,
          decision: input.decision,
          note: input.note ?? null,
        });

        // Approved → ready (draft, reviewedBy stamped); changes → back to draft.
        await context.db
          .update(userChapters)
          .set({
            status: "draft",
            reviewedBy: input.decision === "approved" ? context.user.id : null,
          })
          .where(eq(userChapters.id, input.id));

        return { ok: true };
      }),
  },

  textChapter: {
    /**
     * Create a TEXT chapter for a novel work (canEditChapters). Content is
     * tokenized and cached on save so reads never tokenize at request time.
     */
    add: authed
      .input(textChapterCreateSchema.extend({ id: z.number().int().positive() }))
      .handler(async ({ input, context }) => {
        const workId = input.id;
        const access = await getWorkAccess(workId, context.user.id);
        if (!access.canEditChapters) throw new ORPCError("FORBIDDEN");

        const { userWorks, userChapters } = schema;
        const [work] = await context.db
          .select({ kind: userWorks.kind, language: userWorks.language })
          .from(userWorks)
          .where(eq(userWorks.id, workId))
          .limit(1);
        if (!work || work.kind !== "novel" || !work.language) {
          throw new ORPCError("BAD_REQUEST", { message: "not_a_novel" });
        }

        const [chapter] = await context.db
          .insert(userChapters)
          .values({
            workId,
            number: input.number,
            title: input.title ?? null,
            status: "draft",
            createdBy: context.user.id,
          })
          .returning({ id: userChapters.id });

        const stats = await persistChapterText(
          chapter.id,
          work.language as LearnLanguage,
          input.content,
        );

        return { chapter: { id: chapter.id, ...stats } };
      }),
  },
};
