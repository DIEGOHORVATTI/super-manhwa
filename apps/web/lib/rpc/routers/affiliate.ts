import { and, count, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";

import { codeFromBytes, normalizeCode, REF_COOKIE } from "@/lib/affiliate";
import * as schema from "@/lib/db/schema";
import { authed, staff } from "../base";

/**
 * Recurring 20% affiliate program. `get`/`upsertPixKey` are the member dashboard
 * (join + payout Pix key); `attribute` turns the first-touch `ref` cookie into a
 * referral right after signup; `adminList`/`markPaid` drive manual payouts.
 */
export const affiliateRouter = {
  /** Dashboard data: code/link, rate, pix key, referral count + commission totals. */
  get: authed.handler(async ({ context }) => {
    const { affiliates, referrals, affiliateCommissions } = schema;
    const [aff] = await context.db
      .select({
        id: affiliates.id,
        code: affiliates.code,
        ratePct: affiliates.ratePct,
        pixKey: affiliates.pixKey,
      })
      .from(affiliates)
      .where(eq(affiliates.userId, context.user.id))
      .limit(1);
    if (!aff) return { affiliate: null };

    const [refs] = await context.db
      .select({ n: count() })
      .from(referrals)
      .where(eq(referrals.affiliateId, aff.id));
    const totals = await context.db
      .select({
        status: affiliateCommissions.status,
        cents: sql<number>`coalesce(sum(${affiliateCommissions.amountCents}), 0)`,
      })
      .from(affiliateCommissions)
      .where(eq(affiliateCommissions.affiliateId, aff.id))
      .groupBy(affiliateCommissions.status);
    const pending = Number(totals.find((t) => t.status === "pending")?.cents ?? 0);
    const paid = Number(totals.find((t) => t.status === "paid")?.cents ?? 0);

    return {
      affiliate: { code: aff.code, ratePct: aff.ratePct, pixKey: aff.pixKey },
      stats: { referrals: refs.n, pendingCents: pending, paidCents: paid },
    };
  }),

  /** Join the program (creates a unique code) and/or set the payout Pix key. */
  upsertPixKey: authed
    .input(z.object({ pixKey: z.string().trim().max(140).optional() }))
    .handler(async ({ input, context }) => {
      const { affiliates } = schema;
      const [existing] = await context.db
        .select({ id: affiliates.id })
        .from(affiliates)
        .where(eq(affiliates.userId, context.user.id))
        .limit(1);

      if (existing) {
        if (input.pixKey !== undefined) {
          await context.db
            .update(affiliates)
            .set({ pixKey: input.pixKey })
            .where(eq(affiliates.id, existing.id));
        }
        return { ok: true };
      }

      // New affiliate | generate a unique code (retry on the rare collision).
      let code = "";
      for (let i = 0; i < 5; i++) {
        code = codeFromBytes(crypto.getRandomValues(new Uint8Array(8)));
        const [clash] = await context.db
          .select({ id: affiliates.id })
          .from(affiliates)
          .where(eq(affiliates.code, code))
          .limit(1);
        if (!clash) break;
      }
      await context.db
        .insert(affiliates)
        .values({ userId: context.user.id, code, pixKey: input.pixKey ?? null });
      return { ok: true, code };
    }),

  /**
   * Turns the first-touch `ref` cookie into a referral, called right after
   * signup. Idempotent (referredUserId is unique); no self-referral; clears the
   * cookie. Needs auth | the referral binds to the signed-in user.
   */
  attribute: authed.handler(async ({ context }) => {
    const jar = await cookies();
    const code = normalizeCode(jar.get(REF_COOKIE)?.value);
    if (!code) return { ok: false };

    const { affiliates, referrals } = schema;
    const [aff] = await context.db
      .select({ id: affiliates.id, userId: affiliates.userId })
      .from(affiliates)
      .where(eq(affiliates.code, code))
      .limit(1);

    // Valid affiliate, not self-referral.
    if (aff && aff.userId !== context.user.id) {
      await context.db
        .insert(referrals)
        .values({ affiliateId: aff.id, referredUserId: context.user.id })
        .onConflictDoNothing();
    }

    jar.delete(REF_COOKIE);
    return { ok: true };
  }),

  /** Admin: affiliates with pending commission total + payout Pix key. */
  adminList: staff.handler(async ({ context }) => {
    const { affiliates, affiliateCommissions, user } = schema;
    const rows = await context.db
      .select({
        id: affiliates.id,
        code: affiliates.code,
        pixKey: affiliates.pixKey,
        name: user.name,
        handle: user.handle,
        pendingCents: sql<number>`coalesce(sum(case when ${affiliateCommissions.status} = 'pending' then ${affiliateCommissions.amountCents} else 0 end), 0)`,
      })
      .from(affiliates)
      .leftJoin(user, eq(affiliates.userId, user.id))
      .leftJoin(affiliateCommissions, eq(affiliateCommissions.affiliateId, affiliates.id))
      .groupBy(affiliates.id, user.name, user.handle);

    return { affiliates: rows.map((r) => ({ ...r, pendingCents: Number(r.pendingCents) })) };
  }),

  /** Admin: mark an affiliate's pending commissions as paid (records a timestamp). */
  markPaid: staff
    .input(z.object({ affiliateId: z.number().int().positive() }))
    .handler(async ({ input, context }) => {
      const { affiliateCommissions } = schema;
      await context.db
        .update(affiliateCommissions)
        .set({ status: "paid", paidAt: new Date() })
        .where(
          and(
            eq(affiliateCommissions.affiliateId, input.affiliateId),
            eq(affiliateCommissions.status, "pending"),
          ),
        );
      return { ok: true };
    }),
};
