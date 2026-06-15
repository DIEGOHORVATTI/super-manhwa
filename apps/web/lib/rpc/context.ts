import "server-only";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb } from "@/lib/db";

/**
 * The signed-in user as it reaches a procedure. Mirrors the Better Auth `user`
 * row plus the additional fields declared on the auth config (role/plan/…). Kept
 * loose on purpose | procedures read only what they need.
 */
export type RpcUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
  plan?: string | null;
  premiumUntil?: string | Date | null;
  banned?: boolean | null;
  handle?: string | null;
  bio?: string | null;
};

export type RpcSession = { user: RpcUser } | null;

/** Drizzle client type (or null when DATABASE_URL is unset). */
export type RpcDb = ReturnType<typeof getDb>;

/**
 * Per-request oRPC context for the web platform router. The Next adapter builds
 * one of these per request (session from Better Auth cookies, db lazily). `db`
 * is null when the database is unconfigured | the `pub`/`authed` builders in
 * `base.ts` turn that into a SERVICE_UNAVAILABLE, while a few public reads
 * tolerate it and degrade to empty.
 */
export type RpcContext = {
  db: RpcDb | null;
  session: RpcSession;
  headers: Headers;
};

export async function createRpcContext(req: Request): Promise<RpcContext> {
  const session = (await getServerSession()) as RpcSession;
  return {
    db: dbEnabled ? getDb() : null,
    session,
    headers: req.headers,
  };
}
