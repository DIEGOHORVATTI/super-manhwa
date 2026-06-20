import { ORPCError } from "@orpc/server";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { cacheChaptersOnRead, cacheWorkOnRead } from "@/lib/cache-works";
import * as schema from "@/lib/db/schema";
import { api } from "@/lib/orpc.server";
import { publicUrlFor } from "@/lib/r2";
import { hasRole } from "@/lib/roles";
import { loadTagCatalog, manualBadgesForUsers } from "@/lib/tags";
import { translatePt } from "@/lib/translate";
import { admin, staff } from "../base";

/**
 * Admin/moderation console surface | gated by `staff` (moderators), matching the
 * original routes: staff run the panels (users, comment moderation, donation
 * history, pending pixel ads) and can ban users / moderate pixels, but changing
 * a user's *role* stays admin-only. The web owns this data in its own Postgres.
 */

const usersRouter = {
  list: staff.handler(async ({ context }) => {
    const { user } = schema;
    const users = await context.db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        handle: user.handle,
        role: user.role,
        banned: user.banned,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt))
      .limit(200);
    // Manual (admin-granted) tags only | achievements aren't managed here.
    const byUser = await manualBadgesForUsers(users.map((u) => u.id));
    return {
      users: users.map((u) => ({
        ...u,
        tags: (byUser.get(u.id) ?? []).map((b) => ({
          key: b.key,
          label: b.label,
          emote: b.emote ?? null,
          emoteUrl: b.emoteUrl ?? null,
          color: b.color ?? null,
        })),
      })),
    };
  }),

  /** Hand out a manual tag (assignable catalog entries only). */
  assignTag: staff
    .input(z.object({ userId: z.string(), tagKey: z.string() }))
    .handler(async ({ input, context }) => {
      const { tags, userTags } = schema;
      const [tag] = await context.db
        .select({ assignable: tags.assignable })
        .from(tags)
        .where(eq(tags.key, input.tagKey))
        .limit(1);
      if (!tag) throw new ORPCError("NOT_FOUND", { message: "Tag inexistente." });
      if (!tag.assignable) {
        throw new ORPCError("FORBIDDEN", { message: "Essa tag é conquistada, não atribuível." });
      }
      await context.db
        .insert(userTags)
        .values({ userId: input.userId, tagKey: input.tagKey })
        .onConflictDoNothing();
      return { ok: true };
    }),

  /** Remove a manual tag (never touches earned achievements). */
  unassignTag: staff
    .input(z.object({ userId: z.string(), tagKey: z.string() }))
    .handler(async ({ input, context }) => {
      const { userTags } = schema;
      await context.db
        .delete(userTags)
        .where(and(eq(userTags.userId, input.userId), eq(userTags.tagKey, input.tagKey)));
      return { ok: true };
    }),

  update: staff
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["user", "staff", "admin"]).optional(),
        banned: z.boolean().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      // Staff may ban, but only admin may change a user's role.
      if (input.role !== undefined && !hasRole(context.user, "admin")) {
        throw new ORPCError("FORBIDDEN", { message: "Apenas admin altera papéis." });
      }
      const set: { role?: string; banned?: boolean; updatedAt: Date } = { updatedAt: new Date() };
      if (input.role !== undefined) set.role = input.role;
      if (input.banned !== undefined) set.banned = input.banned;

      const { user } = schema;
      const [updated] = await context.db
        .update(user)
        .set(set)
        .where(eq(user.id, input.userId))
        .returning({ id: user.id, role: user.role, banned: user.banned });
      return { user: updated };
    }),
};

const commentsRouter = {
  list: staff
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional(),
    )
    .handler(async ({ input, context }) => {
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const { comments, user, cachedChapters, cachedWorks } = schema;
      const [rows, [tot]] = await Promise.all([
        context.db
          .select({
            id: comments.id,
            body: comments.body,
            targetType: comments.targetType,
            targetId: comments.targetId,
            createdAt: comments.createdAt,
            deletedAt: comments.deletedAt,
            authorName: user.name,
            authorHandle: user.handle,
          })
          .from(comments)
          .leftJoin(user, eq(comments.userId, user.id))
          .orderBy(desc(comments.createdAt))
          .limit(limit)
          .offset(offset),
        context.db.select({ n: count() }).from(comments),
      ]);

      // Resolve the work each comment was on (chapter comments go through the
      // cached chapter → its work), so moderators see the title, not an opaque id.
      const workTargets = rows.filter((c) => c.targetType === "work").map((c) => c.targetId);
      const chapterTargets = rows.filter((c) => c.targetType === "chapter").map((c) => c.targetId);
      const chRows = chapterTargets.length
        ? await context.db
            .select({ chapterKey: cachedChapters.chapterKey, catalogId: cachedChapters.catalogId })
            .from(cachedChapters)
            .where(inArray(cachedChapters.chapterKey, chapterTargets))
        : [];
      const chapterToCatalog = new Map(chRows.map((r) => [r.chapterKey, r.catalogId]));
      const catalogIds = [...workTargets, ...chRows.map((r) => r.catalogId)];
      const titleRows = catalogIds.length
        ? await context.db
            .select({ catalogId: cachedWorks.catalogId, title: cachedWorks.title })
            .from(cachedWorks)
            .where(inArray(cachedWorks.catalogId, catalogIds))
        : [];
      const titleMap = new Map(titleRows.map((r) => [r.catalogId, r.title]));

      const list = rows.map((c) => {
        const workId =
          c.targetType === "work" ? c.targetId : (chapterToCatalog.get(c.targetId) ?? null);
        return { ...c, workTitle: workId ? (titleMap.get(workId) ?? null) : null };
      });
      return { comments: list, total: Number(tot?.n ?? 0) };
    }),
};

const donationsRouter = {
  list: staff.handler(async ({ context }) => {
    const { donations } = schema;
    const rows = await context.db
      .select({
        id: donations.id,
        amountCents: donations.amountCents,
        status: donations.status,
        message: donations.message,
        displayName: donations.displayName,
        hidden: donations.hidden,
        createdAt: donations.createdAt,
      })
      .from(donations)
      .orderBy(desc(donations.createdAt))
      .limit(200);

    const totalApprovedCents = rows
      .filter((r) => r.status === "approved")
      .reduce((sum, r) => sum + r.amountCents, 0);
    return { donations: rows, totalApprovedCents };
  }),

  /** Hide/unhide a donation message from the public wall. */
  hide: staff
    .input(z.object({ id: z.number().int(), hidden: z.boolean() }))
    .handler(async ({ input, context }) => {
      await context.db
        .update(schema.donations)
        .set({ hidden: input.hidden })
        .where(eq(schema.donations.id, input.id));
      return { ok: true };
    }),

  /** Delete a donation record (moderation / test cleanup). */
  remove: staff.input(z.object({ id: z.number().int() })).handler(async ({ input, context }) => {
    await context.db.delete(schema.donations).where(eq(schema.donations.id, input.id));
    return { ok: true };
  }),
};

const pixelsRouter = {
  list: staff.handler(async ({ context }) => {
    const { pixelBlocks } = schema;
    const rows = await context.db
      .select()
      .from(pixelBlocks)
      .where(eq(pixelBlocks.status, "pending"));
    return {
      blocks: rows.map((r) => ({
        id: r.id,
        x: r.x,
        y: r.y,
        w: r.w,
        h: r.h,
        linkUrl: r.linkUrl,
        title: r.title,
        imageUrl: r.imageR2Key ? publicUrlFor(r.imageR2Key) : null,
      })),
    };
  }),

  moderate: staff
    .input(z.object({ id: z.number().int().positive(), action: z.enum(["approve", "reject"]) }))
    .handler(async ({ input, context }) => {
      const { pixelBlocks } = schema;
      await context.db
        .update(pixelBlocks)
        .set(
          input.action === "approve"
            ? { status: "approved", approvedAt: new Date() }
            : { status: "rejected" },
        )
        .where(eq(pixelBlocks.id, input.id));
      return { ok: true };
    }),
};

/** Live connector health, proxied from the catalog backend (X-API-KEY server-side). */
const connectorsRouter = {
  list: staff.handler(async () => ({ connectors: await api.connectors() })),
};

/**
 * Catalog cache warming | staff search/browse the catalog and pre-persist works
 * (metadata + cover/banner to R2 + the merged chapter list) so the first public
 * view is instant and survives the source going down. `list` shows what's already
 * cached and when; `warm` does the same write the detail page does on first view.
 */
const cacheRouter = {
  list: staff.handler(async ({ context }) => {
    const { cachedWorks, cachedChapters } = schema;
    const [works, counts] = await Promise.all([
      context.db
        .select({
          catalogId: cachedWorks.catalogId,
          title: cachedWorks.title,
          coverR2Key: cachedWorks.coverR2Key,
          refreshedAt: cachedWorks.refreshedAt,
        })
        .from(cachedWorks)
        .orderBy(desc(cachedWorks.refreshedAt))
        .limit(300),
      context.db
        .select({ catalogId: cachedChapters.catalogId, n: sql<number>`count(*)::int` })
        .from(cachedChapters)
        .groupBy(cachedChapters.catalogId),
    ]);
    const byId = new Map(counts.map((c) => [c.catalogId, Number(c.n)]));
    return {
      items: works.map((w) => ({
        id: w.catalogId,
        title: w.title,
        coverUrl: w.coverR2Key ? publicUrlFor(w.coverR2Key) : null,
        chapters: byId.get(w.catalogId) ?? 0,
        refreshedAt: w.refreshedAt,
      })),
    };
  }),

  warm: staff
    .input(z.object({ id: z.string().min(1).max(512), name: z.string().max(512).optional() }))
    .handler(async ({ input }) => {
      const { id, name } = input;
      const [coreRes, chaptersRes, metaRes] = await Promise.allSettled([
        api.manga.core({ id, name }),
        api.manga.chapters({ id, name }),
        name ? api.manga.meta({ name }) : Promise.resolve(null),
      ]);
      if (coreRes.status !== "fulfilled") {
        throw new ORPCError("NOT_FOUND", { message: "Obra não encontrada na fonte." });
      }
      const core = coreRes.value.core;
      const chapters = chaptersRes.status === "fulfilled" ? chaptersRes.value.chapters : [];
      const meta = metaRes.status === "fulfilled" && metaRes.value ? metaRes.value.meta : null;
      const desc = await translatePt(core.description ?? meta?.description ?? "").catch(() => "");
      await cacheWorkOnRead(id, core, {
        bannerUrl: meta?.bannerImage,
        descriptionPt: desc || undefined,
      });
      await cacheChaptersOnRead(id, chapters);
      return { ok: true, chapters: chapters.length };
    }),
};

/** Editable badge catalog | list is staff (used by the assign UI), writes are admin. */
const tagSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Use minúsculas, números e hífens."),
  label: z.string().min(1).max(40),
  emote: z
    .string()
    .max(40)
    .regex(/^[a-z0-9_-]+$/i, "Nome de emote inválido.")
    .nullish(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor hex (#rrggbb).")
    .nullish(),
  description: z.string().max(160).nullish(),
  assignable: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const tagsRouter = {
  list: staff.handler(async () => ({ tags: await loadTagCatalog() })),

  create: admin.input(tagSchema).handler(async ({ input, context }) => {
    await context.db.insert(schema.tags).values({
      key: input.key,
      label: input.label,
      emote: input.emote ?? null,
      color: input.color ?? null,
      description: input.description ?? null,
      assignable: input.assignable ?? true,
      sortOrder: input.sortOrder ?? 0,
    });
    return { ok: true };
  }),

  update: admin
    .input(tagSchema.partial().extend({ key: tagSchema.shape.key }))
    .handler(async ({ input, context }) => {
      const { key, ...rest } = input;
      await context.db.update(schema.tags).set(rest).where(eq(schema.tags.key, key));
      return { ok: true };
    }),

  remove: admin
    .input(z.object({ key: tagSchema.shape.key }))
    .handler(async ({ input, context }) => {
      await context.db.delete(schema.tags).where(eq(schema.tags.key, input.key));
      return { ok: true };
    }),
};

/** DMCA takedowns + contact submissions | a read-only inbox with cleanup. */
const legalRouter = {
  list: staff.handler(async ({ context }) => {
    const { legalRequests } = schema;
    const rows = await context.db
      .select()
      .from(legalRequests)
      .orderBy(desc(legalRequests.createdAt))
      .limit(300);
    return {
      requests: rows.map((r) => {
        let fields: Record<string, unknown> = {};
        try {
          const parsed = JSON.parse(r.payload) as Record<string, unknown>;
          // Drop the honeypot; it's always empty for real submissions.
          const { hp: _hp, ...rest } = parsed;
          fields = rest;
        } catch {
          fields = { payload: r.payload };
        }
        return { id: r.id, type: r.type, createdAt: r.createdAt, fields };
      }),
    };
  }),

  remove: staff.input(z.object({ id: z.number().int() })).handler(async ({ input, context }) => {
    await context.db.delete(schema.legalRequests).where(eq(schema.legalRequests.id, input.id));
    return { ok: true };
  }),
};

export const adminRouter = {
  users: usersRouter,
  tags: tagsRouter,
  comments: commentsRouter,
  donations: donationsRouter,
  pixels: pixelsRouter,
  connectors: connectorsRouter,
  cache: cacheRouter,
  legal: legalRouter,
};
