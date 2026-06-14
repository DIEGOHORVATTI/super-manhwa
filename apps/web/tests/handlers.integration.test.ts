import { beforeEach, describe, expect, it, mock } from "bun:test";

import * as dbSchema from "../lib/db/schema";
import { hasRole } from "../lib/roles";
import { makeFakeDb } from "./helpers/fake-db";

/**
 * Handler-level integration ("e2e") tests. Each route is exercised through its
 * real GET/POST with a Request, while the side-effecting deps (auth/session, db,
 * r2, mercadopago) are mocked via closures read at call time — so a single
 * import of each route serves every case and there's no cross-file mock leakage.
 */

// Mutable test state, set per-test and read inside the mock factories.
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

const profile = await import("../app/api/profile/route");
const adminUsers = await import("../app/api/admin/users/route");
const donations = await import("../app/api/donations/create/route");
const cron = await import("../app/api/cron/publish-scheduled/route");
const studioWorks = await import("../app/api/studio/works/route");

const json = (url: string, method: string, body?: unknown, headers?: Record<string, string>) =>
  new Request(url, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(() => {
  session = null;
  dbResults = [];
});

// Comments moved to the oRPC router — see tests/rpc.comments.test.ts.

describe("PATCH /api/profile", () => {
  const url = "http://t/api/profile";

  it("401 when anonymous", async () => {
    const res = await profile.PATCH(json(url, "PATCH", { name: "X" }));
    expect(res.status).toBe(401);
  });

  it("400 on an invalid handle", async () => {
    session = { user: { id: "u1" } };
    const res = await profile.PATCH(json(url, "PATCH", { handle: "no spaces" }));
    expect(res.status).toBe(400);
  });

  it("409 when the handle is already taken", async () => {
    session = { user: { id: "u1" } };
    dbResults = [[{ id: "other" }]]; // uniqueness probe finds a row
    const res = await profile.PATCH(json(url, "PATCH", { handle: "taken" }));
    expect(res.status).toBe(409);
  });

  it("200 and returns the updated profile", async () => {
    session = { user: { id: "u1" } };
    dbResults = [[], [{ name: "Novo", handle: "novo", bio: null }]];
    const res = await profile.PATCH(json(url, "PATCH", { name: "Novo", handle: "novo" }));
    expect(res.status).toBe(200);
    expect((await res.json()).profile.handle).toBe("novo");
  });
});

describe("PATCH /api/admin/users", () => {
  const url = "http://t/api/admin/users";

  it("403 for non-staff", async () => {
    session = { user: { id: "u1", role: "user" } };
    const res = await adminUsers.PATCH(json(url, "PATCH", { userId: "x", banned: true }));
    expect(res.status).toBe(403);
  });

  it("403 when staff (non-admin) tries to change a role", async () => {
    session = { user: { id: "u1", role: "staff" } };
    const res = await adminUsers.PATCH(json(url, "PATCH", { userId: "x", role: "admin" }));
    expect(res.status).toBe(403);
  });

  it("200 when admin bans a user", async () => {
    session = { user: { id: "u1", role: "admin" } };
    dbResults = [[{ id: "x", role: "user", banned: true }]];
    const res = await adminUsers.PATCH(json(url, "PATCH", { userId: "x", banned: true }));
    expect(res.status).toBe(200);
    expect((await res.json()).user.banned).toBe(true);
  });
});

describe("POST /api/donations/create", () => {
  const url = "http://t/api/donations/create";

  it("400 on an out-of-range amount", async () => {
    const res = await donations.POST(json(url, "POST", { amountCents: 5 }));
    expect(res.status).toBe(400);
  });

  it("201 with QR data on a valid amount", async () => {
    dbResults = [[{ id: 42 }]];
    const res = await donations.POST(json(url, "POST", { amountCents: 1000 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(42);
    expect(data.qrCode).toBe("QR");
  });
});

describe("GET /api/cron/publish-scheduled", () => {
  const url = "http://t/api/cron/publish-scheduled";

  it("401 with a wrong secret", async () => {
    process.env.CRON_SECRET = "right";
    const res = await cron.GET(new Request(url, { headers: { authorization: "Bearer wrong" } }));
    expect(res.status).toBe(401);
    process.env.CRON_SECRET = undefined;
  });

  it("publishes nothing when none are due", async () => {
    process.env.CRON_SECRET = "right";
    dbResults = [[]]; // no due chapters
    const res = await cron.GET(new Request(url, { headers: { authorization: "Bearer right" } }));
    expect(res.status).toBe(200);
    expect((await res.json()).published).toBe(0);
    process.env.CRON_SECRET = undefined;
  });
});

describe("POST /api/studio/works", () => {
  const url = "http://t/api/studio/works";

  it("401 when anonymous", async () => {
    const res = await studioWorks.POST(json(url, "POST", { title: "Obra" }));
    expect(res.status).toBe(401);
  });

  it("201 creating the work and its backing team", async () => {
    session = { user: { id: "u1" } };
    dbResults = [
      [{ id: 10 }], // teams insert returning
      [], // teamMembers insert
      [{ id: 5, slug: "obra-10" }], // userWorks insert returning
    ];
    const res = await studioWorks.POST(json(url, "POST", { title: "Obra" }));
    expect(res.status).toBe(201);
    expect((await res.json()).work.slug).toBe("obra-10");
  });
});
