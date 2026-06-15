import * as dbSchema from "../../lib/db/schema";
import type { RpcContext, RpcUser } from "../../lib/rpc/context";
import { makeFakeDb } from "./fake-db";

export { dbSchema };

/**
 * Build a fake `RpcContext` for unit-testing oRPC procedures via `call()`.
 * `results` feeds the FIFO fake Drizzle client (one entry per awaited query);
 * `user` populates the session (omit for anonymous); `db: null` simulates an
 * unconfigured database.
 */
export function fakeContext(opts?: {
  results?: unknown[];
  user?: Partial<RpcUser> | null;
  db?: null;
}): RpcContext {
  const hasDb = opts?.db !== null;
  return {
    db: hasDb ? (makeFakeDb(opts?.results ?? []).db as unknown as RpcContext["db"]) : null,
    session: opts?.user ? { user: opts.user as RpcUser } : null,
    headers: new Headers(),
  };
}
