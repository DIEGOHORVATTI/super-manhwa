import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

/**
 * Drizzle client over Neon (serverless Postgres). Lazily constructed so the app
 * builds/runs without a DB — every feature that needs it (legal forms,
 * newsletter, push) checks `dbEnabled` first and degrades gracefully when
 * `DATABASE_URL` is unset.
 */
const url = process.env.DATABASE_URL;
export const dbEnabled = Boolean(url);

let cached: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!cached) cached = drizzle(neon(url), { schema });
  return cached;
}

export { schema };
