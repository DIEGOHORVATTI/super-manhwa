import { call } from "@orpc/server";
import { beforeEach, describe, expect, it, mock } from "bun:test";

import * as dbSchema from "../lib/db/schema";
import { hasRole } from "../lib/roles";
import { makeFakeDb } from "./helpers/fake-db";

/**
 * Integration tests. Migrated platform features are oRPC procedures, invoked via
 * `call()` with a fake context (`fakeContext`) | no HTTP. The routes that remain
 * native (cron) are still exercised through their real GET with the side-effecting
 * modules mocked below.
 */

// Mutable test state for the still-native routes (read inside the mock factories).
let session: { user: Record<string, unknown> } | null = null;
let dbResults: unknown[] = [];

mock.module("@/lib/auth/session", () => ({
  getServerSession: async () => session,
  getCurrentUser: async () => session?.user ?? null,
  hasRole,
}));

mock.module("@/lib/db", () => ({
  dbEnabled: true,
  getDb: () => makeFakeDb(dbResults).db,
  schema: dbSchema,
}));

mock.module("@/lib/r2", () => ({
  r2Enabled: true,
  putObject: async (key: string) => key,
  publicUrlFor: (k: string) => `https://cdn.test/${k}`,
  joinPublicUrl: (b: string, k: string) => `${b}/${k}`,
}));

mock.module("@/lib/payments/mercadopago", () => ({
  mpEnabled: true,
  createPixPayment: async () => ({
    providerPaymentId: "pay_1",
    status: "pending",
    qrCode: "QR",
    qrCodeBase64: "B64",
  }),
  getPaymentStatus: async () => "approved",
}));
// env is parsed once at import; mock it so the cron secret is deterministic.
mock.module("@/lib/env", () => ({
  env: { CRON_SECRET: "right", PIXEL_BLOCK_PRICE_CENTS: 500, LEARN_PREMIUM_PRICE: 14.9 },
}));

const { appRouter } = await import("../lib/rpc/router");
const { fakeContext } = await import("./helpers/rpc-context");
const cron = await import("../app/api/cron/publish-scheduled/route");

beforeEach(() => {
  session = null;
  dbResults = [];
});

describe("rpc.profile.update", () => {
  it("UNAUTHORIZED when anonymous", async () => {
    await expect(
      call(appRouter.profile.update, { name: "X" }, { context: fakeContext() }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("BAD_REQUEST on an invalid handle", async () => {
    await expect(
      call(
        appRouter.profile.update,
        { handle: "no spaces" },
        {
          context: fakeContext({ user: { id: "u1" } }),
        },
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("CONFLICT when the handle is already taken", async () => {
    await expect(
      call(
        appRouter.profile.update,
        { handle: "taken" },
        {
          context: fakeContext({ user: { id: "u1" }, results: [[{ id: "other" }]] }),
        },
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("returns the updated profile", async () => {
    const res = await call(
      appRouter.profile.update,
      { name: "Novo", handle: "novo" },
      {
        context: fakeContext({
          user: { id: "u1" },
          results: [[], [{ name: "Novo", handle: "novo", bio: null }]],
        }),
      },
    );
    expect(res.profile?.handle).toBe("novo");
  });
});

describe("rpc.admin.users.update", () => {
  it("FORBIDDEN for non-staff", async () => {
    await expect(
      call(
        appRouter.admin.users.update,
        { userId: "x", banned: true },
        {
          context: fakeContext({ user: { id: "u1", role: "user" } }),
        },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("FORBIDDEN for staff (admin panel is admin-only)", async () => {
    await expect(
      call(
        appRouter.admin.users.update,
        { userId: "x", role: "admin" },
        {
          context: fakeContext({ user: { id: "u1", role: "staff" } }),
        },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("bans a user when admin", async () => {
    const res = await call(
      appRouter.admin.users.update,
      { userId: "x", banned: true },
      {
        context: fakeContext({
          user: { id: "u1", role: "admin" },
          results: [[{ id: "x", role: "user", banned: true }]],
        }),
      },
    );
    expect(res.user?.banned).toBe(true);
  });
});

describe("rpc.donations.create", () => {
  it("BAD_REQUEST on an out-of-range amount", async () => {
    await expect(
      call(appRouter.donations.create, { amountCents: 5 }, { context: fakeContext() }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns QR data on a valid amount", async () => {
    const res = await call(
      appRouter.donations.create,
      { amountCents: 1000 },
      {
        context: fakeContext({ results: [[{ id: 42 }]] }),
      },
    );
    expect(res.id).toBe(42);
    expect(res.qrCode).toBe("QR");
  });
});

describe("rpc.studio.works.create", () => {
  it("UNAUTHORIZED when anonymous", async () => {
    await expect(
      call(appRouter.studio.works.create, { title: "Obra" }, { context: fakeContext() }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("creates the work and its backing team", async () => {
    const res = await call(
      appRouter.studio.works.create,
      { title: "Obra" },
      {
        context: fakeContext({
          user: { id: "u1" },
          results: [
            [{ id: 10 }], // teams insert returning
            [], // teamMembers insert
            [{ id: 5, slug: "obra-10" }], // userWorks insert returning
          ],
        }),
      },
    );
    expect(res.work?.slug).toBe("obra-10");
  });
});

describe("GET /api/cron/publish-scheduled", () => {
  const url = "http://t/api/cron/publish-scheduled";

  it("401 with a wrong secret", async () => {
    const res = await cron.GET(new Request(url, { headers: { authorization: "Bearer wrong" } }));
    expect(res.status).toBe(401);
  });

  it("publishes nothing when none are due", async () => {
    dbResults = [[]]; // no due chapters
    const res = await cron.GET(new Request(url, { headers: { authorization: "Bearer right" } }));
    expect(res.status).toBe(200);
    expect((await res.json()).published).toBe(0);
  });
});
