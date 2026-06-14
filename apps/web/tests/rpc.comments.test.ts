import { call } from "@orpc/server";
import { beforeEach, describe, expect, it, mock } from "bun:test";

import { hasRole } from "../lib/roles";

// roles is pulled in by the base builders; keep it real (it's pure).
mock.module("@/lib/roles", () => ({ hasRole }));

const { appRouter } = await import("../lib/rpc/router");
const { fakeContext } = await import("./helpers/rpc-context");

/**
 * Unit tests for the comments oRPC router — procedures are invoked directly via
 * `call()` with a fake context (no HTTP, no mock.module of db/auth). The middleware
 * chain (db guard → auth → handler) runs for real.
 */
describe("rpc.comments.create", () => {
  const good = { targetType: "work" as const, targetId: "m1", body: "olá" };

  it("rejects anonymous with UNAUTHORIZED", async () => {
    await expect(
      call(appRouter.comments.create, good, { context: fakeContext() }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a banned user with FORBIDDEN", async () => {
    await expect(
      call(appRouter.comments.create, good, {
        context: fakeContext({ user: { id: "u1", banned: true } }),
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects invalid input with BAD_REQUEST", async () => {
    await expect(
      call(appRouter.comments.create, { targetType: "page", targetId: "", body: "" } as never, {
        context: fakeContext({ user: { id: "u1" } }),
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("503 when the database is unconfigured", async () => {
    await expect(
      call(appRouter.comments.create, good, {
        context: fakeContext({ user: { id: "u1" }, db: null }),
      }),
    ).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });

  it("echoes the created comment on success", async () => {
    const res = await call(appRouter.comments.create, good, {
      context: fakeContext({
        user: { id: "u1" },
        results: [[{ id: 7, body: "olá", targetType: "work", targetId: "m1" }]],
      }),
    });
    expect(res.comment.id).toBe(7);
  });
});

describe("rpc.comments.list", () => {
  beforeEach(() => {});

  it("degrades to empty without a database", async () => {
    const res = await call(
      appRouter.comments.list,
      { targetType: "work", targetId: "m1" },
      { context: fakeContext({ db: null }) },
    );
    expect(res.comments).toHaveLength(0);
    expect(res.meId).toBeNull();
  });

  it("returns the thread and hides soft-deleted bodies", async () => {
    const res = await call(
      appRouter.comments.list,
      { targetType: "work", targetId: "m1" },
      {
        context: fakeContext({
          user: { id: "u1" },
          results: [
            [
              { id: 1, userId: "u1", body: "mine", deletedAt: null, parentId: null },
              {
                id: 2,
                userId: "u2",
                body: "secret",
                deletedAt: new Date("2024-01-01"),
                parentId: null,
              },
            ],
          ],
        }),
      },
    );
    expect(res.comments).toHaveLength(2);
    expect(res.comments.find((c) => c.id === 1)?.mine).toBe(true);
    expect(res.comments.find((c) => c.id === 2)?.body).toBeNull();
  });
});
