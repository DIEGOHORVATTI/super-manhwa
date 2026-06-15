import "server-only";
import { headers } from "next/headers";

import { hasRole } from "@/lib/roles";
import { auth } from "./server";

export { hasRole };

/**
 * Current session for Server Components / route handlers. Returns null when auth
 * is unconfigured or the visitor is anonymous. `user.role`/`user.banned` come
 * from the additional fields declared on the Better Auth `user` config.
 */
export async function getServerSession() {
  if (!auth) return null;
  return auth.api.getSession({ headers: await headers() });
}

export async function getCurrentUser() {
  const s = await getServerSession();
  return s?.user ?? null;
}
