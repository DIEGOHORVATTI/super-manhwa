import { ORPCError } from "@orpc/server";
import { profileSchema } from "@packages/contracts";
import { and, eq, ne } from "drizzle-orm";

import * as schema from "@/lib/db/schema";
import { authed } from "../base";

/**
 * Profile of the signed-in user. Handle is the public slug for /u/[handle]
 * | lowercase letters, digits and underscores, enforced unique here (Better Auth
 * doesn't dedupe additional fields).
 */
export const profileRouter = {
  update: authed.input(profileSchema).handler(async ({ input, context }) => {
    const { user } = schema;

    if (input.handle) {
      const taken = await context.db
        .select({ id: user.id })
        .from(user)
        .where(and(eq(user.handle, input.handle), ne(user.id, context.user.id)))
        .limit(1);
      if (taken.length) {
        throw new ORPCError("CONFLICT", { message: "Esse @ já está em uso." });
      }
    }

    const [updated] = await context.db
      .update(user)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(user.id, context.user.id))
      .returning({ name: user.name, handle: user.handle, bio: user.bio });
    return { profile: updated };
  }),
};
