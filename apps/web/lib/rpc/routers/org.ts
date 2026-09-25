import { randomUUID } from "node:crypto";

import { ORPCError } from "@orpc/server";
import { render } from "@react-email/render";
import {
  orgCreateSchema,
  orgInviteSchema,
  orgMemberAddSchema,
  orgUpdateSchema,
  slugifyOrg,
} from "@packages/contracts";
import { OrgInviteEmail } from "@packages/emails";
import { and, desc, eq, isNotNull, ne } from "drizzle-orm";
import { z } from "zod";

import { emailEnabled, sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { publicUrlFor, r2Enabled } from "@/lib/r2";
import { routes } from "@/lib/routes";
import * as schema from "@/lib/db/schema";
import { authed, pub } from "../base";
import type { RpcDb } from "../context";

/** Role label for the invitation e-mail. */
const ROLE_PT: Record<string, string> = {
  editor: "Editor",
  translator: "Tradutor",
  reviewer: "Revisor",
};

/**
 * Organização surface | a team that carries a public `slug` is an Organização
 * (a scanlation group / studio): a public page, a roster of members with roles,
 * and the works published under it. The auto-created per-work teams keep a null
 * slug and never surface here. Owner is `teams.ownerId`; finer roles live in
 * `teamMembers` (editor/translator/reviewer) and reuse `perms.computeAccess`.
 */

const orgIdInput = z.object({ id: z.number().int().positive() });

/** True when `userId` owns org `teamId`. */
async function ownsOrg(db: RpcDb, teamId: number, userId: string) {
  const [team] = await db
    .select({ ownerId: schema.teams.ownerId })
    .from(schema.teams)
    .where(eq(schema.teams.id, teamId))
    .limit(1);
  return team?.ownerId === userId;
}

export const orgRouter = {
  /** Create a standalone Organização; the creator becomes its owner member. */
  create: authed.input(orgCreateSchema).handler(async ({ input, context }) => {
    const { teams, teamMembers } = schema;
    const userId = context.user.id;

    const base = slugifyOrg(input.name);
    const [taken] = await context.db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.slug, base))
      .limit(1);

    const [team] = await context.db
      .insert(teams)
      .values({ name: input.name, ownerId: userId })
      .returning({ id: teams.id });
    const slug = taken ? `${base}-${team.id}` : base; // id suffix only on collision
    await context.db.update(teams).set({ slug }).where(eq(teams.id, team.id));
    await context.db.insert(teamMembers).values({ teamId: team.id, userId, role: "owner" });

    return { org: { id: team.id, slug } };
  }),

  /** Organizações I belong to (slug != null marks a real org, not a work team). */
  mine: authed.handler(async ({ context }) => {
    const { teams, teamMembers } = schema;
    const orgs = await context.db
      .select({
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
        isPublic: teams.isPublic,
        avatarR2Key: teams.avatarR2Key,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(and(eq(teamMembers.userId, context.user.id), isNotNull(teams.slug)))
      .orderBy(desc(teams.createdAt));
    return { orgs };
  }),

  /** Owner's management view: identity + members + pending invites + the
   *  caller's works (to attach/detach). One call backs the whole manage page. */
  manage: authed.input(orgIdInput).handler(async ({ input, context }) => {
    const { teams, teamMembers, orgInvitations, userWorks, user } = schema;
    const [org] = await context.db.select().from(teams).where(eq(teams.id, input.id)).limit(1);
    if (!org || !org.slug) throw new ORPCError("NOT_FOUND");
    if (org.ownerId !== context.user.id) throw new ORPCError("FORBIDDEN");

    const members = await context.db
      .select({
        userId: teamMembers.userId,
        role: teamMembers.role,
        name: user.name,
        handle: user.handle,
      })
      .from(teamMembers)
      .leftJoin(user, eq(teamMembers.userId, user.id))
      .where(eq(teamMembers.teamId, org.id));

    const invitations = await context.db
      .select({ id: orgInvitations.id, email: orgInvitations.email, role: orgInvitations.role })
      .from(orgInvitations)
      .where(and(eq(orgInvitations.teamId, org.id), eq(orgInvitations.status, "pending")))
      .orderBy(desc(orgInvitations.createdAt));

    const myWorks = await context.db
      .select({
        id: userWorks.id,
        title: userWorks.title,
        slug: userWorks.slug,
        teamId: userWorks.teamId,
        status: userWorks.status,
      })
      .from(userWorks)
      .where(eq(userWorks.ownerId, context.user.id))
      .orderBy(desc(userWorks.createdAt));

    const avatarUrl = org.avatarR2Key && r2Enabled ? publicUrlFor(org.avatarR2Key) : null;
    const bannerUrl = org.bannerR2Key && r2Enabled ? publicUrlFor(org.bannerR2Key) : null;

    return { org, members, invitations, myWorks, avatarUrl, bannerUrl };
  }),

  invite: {
    /** Public peek at a pending invite (so the accept page can show context). */
    peek: pub.input(z.object({ token: z.string() })).handler(async ({ input, context }) => {
      const { orgInvitations, teams } = schema;
      const [row] = await context.db
        .select({
          email: orgInvitations.email,
          role: orgInvitations.role,
          status: orgInvitations.status,
          orgName: teams.name,
        })
        .from(orgInvitations)
        .leftJoin(teams, eq(orgInvitations.teamId, teams.id))
        .where(eq(orgInvitations.token, input.token))
        .limit(1);
      if (!row || row.status !== "pending") return { invite: null };
      return {
        invite: { email: row.email, role: row.role, orgName: row.orgName ?? "Organização" },
      };
    }),

    /** Invite someone by e-mail (owner only). Returns the link too, so the owner
     *  can share it manually when e-mail isn't configured. */
    send: authed
      .input(orgInviteSchema.extend(orgIdInput.shape))
      .handler(async ({ input, context }) => {
        if (!(await ownsOrg(context.db, input.id, context.user.id))) {
          throw new ORPCError("FORBIDDEN");
        }
        const { teams, orgInvitations } = schema;
        const [org] = await context.db
          .select({ name: teams.name })
          .from(teams)
          .where(eq(teams.id, input.id))
          .limit(1);
        if (!org) throw new ORPCError("NOT_FOUND");

        const token = randomUUID();
        await context.db.insert(orgInvitations).values({
          teamId: input.id,
          email: input.email,
          role: input.role,
          token,
          invitedBy: context.user.id,
        });

        const base = context.headers.get("origin") ?? env.BETTER_AUTH_URL ?? "";
        const link = `${base}${routes.orgInvite(token)}`;
        if (emailEnabled) {
          try {
            const html = await render(
              OrgInviteEmail({ url: link, orgName: org.name, role: ROLE_PT[input.role] }),
            );
            await sendEmail({
              to: input.email,
              subject: `Convite para ${org.name} | Super Manhwa`,
              html,
            });
          } catch {
            // e-mail failed | the owner still has the link to share manually
          }
        }
        return { ok: true, link };
      }),

    /** Revoke a pending invite (owner only). */
    revoke: authed
      .input(orgIdInput.extend({ inviteId: z.number().int().positive() }))
      .handler(async ({ input, context }) => {
        if (!(await ownsOrg(context.db, input.id, context.user.id))) {
          throw new ORPCError("FORBIDDEN");
        }
        const { orgInvitations } = schema;
        await context.db
          .update(orgInvitations)
          .set({ status: "revoked" })
          .where(and(eq(orgInvitations.id, input.inviteId), eq(orgInvitations.teamId, input.id)));
        return { ok: true };
      }),

    /** Accept an invite (the signed-in user must own the invited e-mail). */
    accept: authed.input(z.object({ token: z.string() })).handler(async ({ input, context }) => {
      const { orgInvitations, teamMembers, teams } = schema;
      const [inv] = await context.db
        .select()
        .from(orgInvitations)
        .where(eq(orgInvitations.token, input.token))
        .limit(1);
      if (!inv || inv.status !== "pending") {
        throw new ORPCError("NOT_FOUND", { message: "Convite inválido ou já usado." });
      }
      if ((context.user.email ?? "").toLowerCase() !== inv.email.toLowerCase()) {
        throw new ORPCError("FORBIDDEN", { message: "Este convite é para outro e-mail." });
      }

      await context.db
        .insert(teamMembers)
        .values({ teamId: inv.teamId, userId: context.user.id, role: inv.role })
        .onConflictDoUpdate({
          target: [teamMembers.teamId, teamMembers.userId],
          set: { role: inv.role },
        });
      await context.db
        .update(orgInvitations)
        .set({ status: "accepted" })
        .where(eq(orgInvitations.id, inv.id));

      const [org] = await context.db
        .select({ slug: teams.slug })
        .from(teams)
        .where(eq(teams.id, inv.teamId))
        .limit(1);
      return { ok: true, slug: org?.slug ?? null };
    }),
  },

  /** Edit org identity (owner only). */
  update: authed
    .input(orgUpdateSchema.extend(orgIdInput.shape))
    .handler(async ({ input, context }) => {
      const { id, ...patch } = input;
      if (!(await ownsOrg(context.db, id, context.user.id))) throw new ORPCError("FORBIDDEN");

      const { teams } = schema;
      if (patch.slug) {
        const [dupe] = await context.db
          .select({ id: teams.id })
          .from(teams)
          .where(and(eq(teams.slug, patch.slug), ne(teams.id, id)))
          .limit(1);
        if (dupe) throw new ORPCError("CONFLICT", { message: "Esse endereço já está em uso." });
      }
      await context.db.update(teams).set(patch).where(eq(teams.id, id));
      return { ok: true };
    }),

  member: {
    /** Add/update a member by @handle (owner only). */
    add: authed
      .input(orgMemberAddSchema.extend(orgIdInput.shape))
      .handler(async ({ input, context }) => {
        if (!(await ownsOrg(context.db, input.id, context.user.id))) {
          throw new ORPCError("FORBIDDEN");
        }
        const { teamMembers, user } = schema;
        const [target] = await context.db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.handle, input.handle))
          .limit(1);
        if (!target) throw new ORPCError("NOT_FOUND", { message: "Usuário não encontrado." });

        await context.db
          .insert(teamMembers)
          .values({ teamId: input.id, userId: target.id, role: input.role })
          .onConflictDoUpdate({
            target: [teamMembers.teamId, teamMembers.userId],
            set: { role: input.role },
          });
        return { ok: true };
      }),

    /** Remove a member (owner only; the owner can't be removed). */
    remove: authed
      .input(orgIdInput.extend({ userId: z.string() }))
      .handler(async ({ input, context }) => {
        if (!(await ownsOrg(context.db, input.id, context.user.id))) {
          throw new ORPCError("FORBIDDEN");
        }
        if (input.userId === context.user.id) {
          throw new ORPCError("BAD_REQUEST", { message: "O dono não pode se remover." });
        }
        const { teamMembers } = schema;
        await context.db
          .delete(teamMembers)
          .where(and(eq(teamMembers.teamId, input.id), eq(teamMembers.userId, input.userId)));
        return { ok: true };
      }),
  },

  /** Attach a work I own to an org I belong to (or detach with orgId = null). */
  attachWork: authed
    .input(orgIdInput.extend({ workId: z.number().int().positive() }).partial({ id: true }))
    .handler(async ({ input, context }) => {
      const { userWorks, teamMembers } = schema;
      const userId = context.user.id;

      const [work] = await context.db
        .select({ ownerId: userWorks.ownerId })
        .from(userWorks)
        .where(eq(userWorks.id, input.workId))
        .limit(1);
      if (!work) throw new ORPCError("NOT_FOUND");
      if (work.ownerId !== userId) throw new ORPCError("FORBIDDEN");

      if (input.id != null) {
        const [member] = await context.db
          .select({ role: teamMembers.role })
          .from(teamMembers)
          .where(and(eq(teamMembers.teamId, input.id), eq(teamMembers.userId, userId)))
          .limit(1);
        if (!member) throw new ORPCError("FORBIDDEN", { message: "Você não é membro da org." });
      }

      await context.db
        .update(userWorks)
        .set({ teamId: input.id ?? null })
        .where(eq(userWorks.id, input.workId));
      return { ok: true };
    }),
};
