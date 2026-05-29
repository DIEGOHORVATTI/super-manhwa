import "server-only";
import { cookies } from "next/headers";

import { SESSION_COOKIE } from "./session-cookie";

/** The visitor's anonymous session id (set by middleware), or "" if absent. */
export async function getSessionId(): Promise<string> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? "";
}
