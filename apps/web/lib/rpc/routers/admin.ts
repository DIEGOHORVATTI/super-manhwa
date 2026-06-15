import { ORPCError } from "@orpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import * as schema from "@/lib/db/schema";
import { publicUrlFor } from "@/lib/r2";
import { hasRole } from "@/lib/roles";
import { staff } from "../base";

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
    return { users };
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
  list: staff.handler(async ({ context }) => {
    const { comments, user } = schema;
    const rows = await context.db
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
      .limit(100);
    return { comments: rows };
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

export const adminRouter = {
  users: usersRouter,
  comments: commentsRouter,
  donations: donationsRouter,
  pixels: pixelsRouter,
};
