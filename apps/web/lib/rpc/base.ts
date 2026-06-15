import { ORPCError, os } from "@orpc/server";

import { hasRole } from "@/lib/roles";
import type { RpcContext } from "./context";

/**
 * Builders for the web platform router | the single place the oRPC programming
 * model is set up for `apps/web` (the catalog/reading API lives in the separate
 * backend service; this is the web's own stateful surface). Schemas come from
 * `@packages/contracts`; handlers return plain objects that become the wire DTO.
 *
 * Tiers, each narrowing the context for everything downstream:
 *   base   | raw context; `db` may be null. Use for public reads that degrade.
 *   pub    | db guaranteed (else SERVICE_UNAVAILABLE). Anonymous allowed.
 *   authed | pub + a signed-in, non-banned user (`context.user`).
 *   staff  | authed + role ≥ staff (moderation).
 *   admin  | authed + role admin.
 */
export const base = os.$context<RpcContext>();

/** Database required | turns an unconfigured DB into a clean 503. */
export const pub = base.use(({ context, next }) => {
  if (!context.db) {
    throw new ORPCError("SERVICE_UNAVAILABLE", { message: "Banco de dados indisponível." });
  }
  return next({ context: { ...context, db: context.db } });
});

/** Signed-in, non-banned user required. */
export const authed = pub.use(({ context, next }) => {
  const user = context.session?.user;
  if (!user) throw new ORPCError("UNAUTHORIZED");
  if (user.banned) throw new ORPCError("FORBIDDEN", { message: "Conta suspensa." });
  return next({ context: { ...context, user } });
});

/** Moderator (staff or admin). */
export const staff = authed.use(({ context, next }) => {
  if (!hasRole(context.user, "staff")) throw new ORPCError("FORBIDDEN");
  return next({ context });
});

/** Admin only. */
export const admin = authed.use(({ context, next }) => {
  if (!hasRole(context.user, "admin")) throw new ORPCError("FORBIDDEN");
  return next({ context });
});
