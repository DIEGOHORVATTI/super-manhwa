import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import * as schema from "@/lib/db/schema";
import { authed } from "../base";

/**
 * AniList account linking. Unlike the favourites sync (which keeps the token in
 * localStorage), this persists the AniList identity against the signed-in user
 * in the `account` table, so one user can attach several AniList accounts.
 *
 * link   { token } — resolves the AniList viewer via GraphQL and upserts the link.
 * list             — lists the current user's linked AniList accounts.
 * unlink { accountId } — detaches one AniList account from the user.
 */
const ENDPOINT = "https://graphql.anilist.co";

async function fetchViewer(token: string): Promise<{ id: number; name: string } | null> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: "query { Viewer { id name } }" }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { Viewer?: { id: number; name: string } } };
    return json.data?.Viewer ?? null;
  } catch {
    return null;
  }
}

export const anilistRouter = {
  list: authed.handler(async ({ context }) => {
    const { account } = schema;
    const rows = await context.db
      .select({ accountId: account.accountId, scope: account.scope })
      .from(account)
      .where(and(eq(account.userId, context.user.id), eq(account.providerId, "anilist")));
    // `scope` reused to stash the AniList display name (no real OAuth scopes here).
    return {
      accounts: rows.map((r) => ({ id: r.accountId, name: r.scope ?? r.accountId })),
    };
  }),

  link: authed
    .input(z.object({ token: z.string().min(10) }))
    .handler(async ({ input, context }) => {
      const viewer = await fetchViewer(input.token);
      if (!viewer) throw new ORPCError("BAD_GATEWAY", { message: "anilist_unreachable" });

      const { account } = schema;
      const accountId = String(viewer.id);
      const now = new Date();

      // One AniList account links to one platform user — re-linking updates the token.
      const existing = await context.db
        .select({ id: account.id })
        .from(account)
        .where(and(eq(account.providerId, "anilist"), eq(account.accountId, accountId)))
        .limit(1);

      if (existing.length) {
        await context.db
          .update(account)
          .set({
            userId: context.user.id,
            accessToken: input.token,
            scope: viewer.name,
            updatedAt: now,
          })
          .where(eq(account.id, existing[0].id));
      } else {
        await context.db.insert(account).values({
          id: `anilist:${accountId}:${context.user.id}`,
          userId: context.user.id,
          providerId: "anilist",
          accountId,
          accessToken: input.token,
          scope: viewer.name,
          createdAt: now,
          updatedAt: now,
        });
      }
      return { linked: { id: accountId, name: viewer.name } };
    }),

  unlink: authed.input(z.object({ accountId: z.string() })).handler(async ({ input, context }) => {
    const { account } = schema;
    await context.db
      .delete(account)
      .where(
        and(
          eq(account.userId, context.user.id),
          eq(account.providerId, "anilist"),
          eq(account.accountId, input.accountId),
        ),
      );
    return { ok: true };
  }),
};
