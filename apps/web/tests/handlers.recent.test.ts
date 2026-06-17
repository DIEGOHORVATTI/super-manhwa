import { call } from "@orpc/server";
import { beforeEach, describe, expect, it, mock } from "bun:test";

import * as dbSchema from "../lib/db/schema";
import { hasRole } from "../lib/roles";
import { makeFakeDb } from "./helpers/fake-db";

/**
 * Integration tests for the recent feature round. Migrated platform features are
 * oRPC procedures invoked via `call()` with a fake context; routes that stay
 * native (the catalog `/api/list` proxy, the Pix webhook, multipart cover upload)
 * are exercised through their real handlers with the side-effecting deps mocked.
 */
let session: { user: Record<string, unknown> } | null = null;
let dbResults: unknown[] = [];
let workAccess: Record<string, boolean> = {};
let refCookie: string | null = null;
let mpPaymentStatus = "approved";
let mpSubStatus = "authorized";
let readingUnlocked: string[] = [];

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
  putObject: async (k: string) => k,
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
  getPaymentStatus: async () => mpPaymentStatus,
  createSubscription: async () => ({
    id: "sub_1",
    status: "pending",
    initPoint: "https://mp/checkout",
  }),
  getSubscriptionStatus: async () => mpSubStatus,
}));
mock.module("@/lib/perms", () => ({
  getWorkAccess: async () => workAccess,
}));
mock.module("@/lib/reading-sync", () => ({
  syncReadingAchievements: async () => readingUnlocked,
}));
mock.module("@/lib/orpc.server", () => ({
  api: {
    manga: {
      popular: async () => ({ list: [{ id: "pop" }], hasNextPage: true }),
      search: async () => ({ list: [{ id: "search" }], hasNextPage: false }),
    },
  },
}));
mock.module("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "ref" && refCookie ? { value: refCookie } : undefined),
    delete: () => {},
  }),
}));

const { appRouter } = await import("../lib/rpc/router");
const { fakeContext } = await import("./helpers/rpc-context");
const list = await import("../app/api/list/route");
const pixelWebhook = await import("../app/api/pixels/webhook/route");
const cover = await import("../app/api/studio/works/[id]/cover/route");

const get = (url: string) => new Request(url);
const json = (url: string, method: string, body?: unknown) =>
  new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
function multipart(fields: Record<string, string>, withImage = true) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  if (withImage)
    fd.set("image", new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" }));
  return new Request("http://t/x", { method: "POST", body: fd });
}
const pngFile = () => new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" });

beforeEach(() => {
  session = null;
  dbResults = [];
  workAccess = {};
  refCookie = null;
  mpPaymentStatus = "approved";
  mpSubStatus = "authorized";
  readingUnlocked = [];
});

describe("GET /api/list (native catalog proxy)", () => {
  it("uses search when q has 2+ chars", async () => {
    const res = await list.GET(get("http://t/api/list?feed=browse&q=naruto"));
    expect((await res.json()).list[0].id).toBe("search");
  });
  it("browses by popular otherwise", async () => {
    const res = await list.GET(get("http://t/api/list?feed=browse"));
    expect((await res.json()).list[0].id).toBe("pop");
  });
});

describe("rpc.reading.track", () => {
  it("UNAUTHORIZED when anonymous", async () => {
    await expect(
      call(appRouter.reading.track, { workId: "m", chapterId: "c" }, { context: fakeContext() }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it("records a new chapter and reports unlocked badges", async () => {
    readingUnlocked = ["read_10_works"];
    const res = await call(
      appRouter.reading.track,
      { workId: "m", chapterId: "c" },
      {
        context: fakeContext({ user: { id: "u1" }, results: [[{ id: 1 }]] }),
      },
    );
    expect(res.unlocked).toEqual(["read_10_works"]);
  });
});

describe("rpc.affiliate", () => {
  it("get → null when not an affiliate", async () => {
    const res = await call(appRouter.affiliate.get, undefined as never, {
      context: fakeContext({ user: { id: "u1" }, results: [[]] }),
    });
    expect(res.affiliate).toBeNull();
  });
  it("get → stats when an affiliate", async () => {
    const res = await call(appRouter.affiliate.get, undefined as never, {
      context: fakeContext({
        user: { id: "u1" },
        results: [
          [{ id: 1, code: "abc123", ratePct: 20, pixKey: null }],
          [{ n: 3 }],
          [{ status: "pending", cents: 600 }],
        ],
      }),
    });
    expect(res.affiliate?.code).toBe("abc123");
    expect(res.stats?.referrals).toBe(3);
    expect(res.stats?.pendingCents).toBe(600);
  });
  it("upsertPixKey join creates a code", async () => {
    const res = await call(
      appRouter.affiliate.upsertPixKey,
      {},
      {
        context: fakeContext({ user: { id: "u1" }, results: [[], [], []] }),
      },
    );
    expect(res.code).toMatch(/^[a-z0-9]{8}$/);
  });
});

describe("rpc.affiliate.attribute", () => {
  it("no-op without a ref cookie", async () => {
    const res = await call(appRouter.affiliate.attribute, undefined as never, {
      context: fakeContext({ user: { id: "u1" } }),
    });
    expect(res.ok).toBe(false);
  });
  it("creates a referral for a valid non-self code", async () => {
    refCookie = "abc123";
    const res = await call(appRouter.affiliate.attribute, undefined as never, {
      context: fakeContext({ user: { id: "u1" }, results: [[{ id: 7, userId: "other" }], []] }),
    });
    expect(res.ok).toBe(true);
  });
});

describe("rpc.affiliate admin (staff)", () => {
  it("adminList FORBIDDEN for non-staff", async () => {
    await expect(
      call(appRouter.affiliate.adminList, undefined as never, {
        context: fakeContext({ user: { id: "u1", role: "user" } }),
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("adminList lists for staff", async () => {
    const res = await call(appRouter.affiliate.adminList, undefined as never, {
      context: fakeContext({
        user: { id: "u1", role: "staff" },
        results: [
          [{ id: 1, code: "abc123", pixKey: null, name: "A", handle: "a", pendingCents: 600 }],
        ],
      }),
    });
    expect(res.affiliates[0]?.pendingCents).toBe(600);
  });
  it("markPaid for staff", async () => {
    const res = await call(
      appRouter.affiliate.markPaid,
      { affiliateId: 1 },
      {
        context: fakeContext({ user: { id: "u1", role: "staff" }, results: [[]] }),
      },
    );
    expect(res.ok).toBe(true);
  });
});

describe("rpc.pixels", () => {
  it("grid returns approved ads + taken rects", async () => {
    const res = await call(appRouter.pixels.grid, undefined as never, {
      context: fakeContext({
        results: [
          [
            {
              id: 1,
              x: 0,
              y: 0,
              w: 2,
              h: 2,
              status: "approved",
              imageR2Key: "k",
              reservedUntil: null,
              linkUrl: "https://x",
              title: "t",
            },
          ],
        ],
      }),
    });
    expect(res.ads).toHaveLength(1);
    expect(res.ads[0]?.imageUrl).toContain("/k");
    expect(res.taken).toHaveLength(1);
    expect(res.grid.cols).toBe(100);
  });

  it("reserve: UNAUTHORIZED anon, BAD_REQUEST bad rect, success", async () => {
    await expect(
      call(
        appRouter.pixels.reserve,
        { x: 0, y: 0, w: 2, h: 2, linkUrl: "https://x", image: pngFile() },
        { context: fakeContext() },
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    await expect(
      call(
        appRouter.pixels.reserve,
        { x: 0, y: 0, w: 200, h: 2, linkUrl: "https://x", image: pngFile() },
        { context: fakeContext({ user: { id: "u1", email: "u@x" } }) },
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const res = await call(
      appRouter.pixels.reserve,
      { x: 0, y: 0, w: 2, h: 2, linkUrl: "https://x", image: pngFile() },
      {
        context: fakeContext({
          user: { id: "u1", email: "u@x" },
          results: [[], [{ id: 5 }], []], // no collision, insert returning, update
        }),
      },
    );
    expect(res.qrCode).toBe("QR");
  });

  it("status: NOT_FOUND when missing, value when present", async () => {
    await expect(
      call(appRouter.pixels.status, { id: "9" }, { context: fakeContext({ results: [[]] }) }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const res = await call(
      appRouter.pixels.status,
      { id: "9" },
      {
        context: fakeContext({ results: [[{ status: "approved" }]] }),
      },
    );
    expect(res.status).toBe("approved");
  });

  it("webhook (native) flips reserved → pending only on approval", async () => {
    dbResults = [[]]; // the update
    mpPaymentStatus = "approved";
    const res = await pixelWebhook.POST(
      json("http://t", "POST", { type: "payment", data: { id: "pay_1" } }),
    );
    expect((await res.json()).ok).toBe(true);
  });
});

describe("rpc.admin.pixels (staff)", () => {
  it("list FORBIDDEN non-staff; lists pending for staff", async () => {
    await expect(
      call(appRouter.admin.pixels.list, undefined as never, {
        context: fakeContext({ user: { id: "u1", role: "user" } }),
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const res = await call(appRouter.admin.pixels.list, undefined as never, {
      context: fakeContext({
        user: { id: "u1", role: "staff" },
        results: [
          [{ id: 1, x: 0, y: 0, w: 2, h: 2, linkUrl: "https://x", title: "t", imageR2Key: "k" }],
        ],
      }),
    });
    expect(res.blocks[0]?.imageUrl).toContain("/k");
  });
  it("moderate approve", async () => {
    const res = await call(
      appRouter.admin.pixels.moderate,
      { id: 1, action: "approve" },
      {
        context: fakeContext({ user: { id: "u1", role: "staff" }, results: [[]] }),
      },
    );
    expect(res.ok).toBe(true);
  });
});

describe("POST /api/studio/works/[id]/cover (native upload)", () => {
  it("403 without canEditWork", async () => {
    session = { user: { id: "u1" } };
    workAccess = { canEditWork: false };
    expect((await cover.POST(multipart({}), params("1"))).status).toBe(403);
  });
  it("uploads and returns the cover URL", async () => {
    session = { user: { id: "u1" } };
    workAccess = { canEditWork: true };
    dbResults = [[]]; // the update
    const res = await cover.POST(multipart({}), params("1"));
    expect(res.status).toBe(200);
    expect((await res.json()).coverUrl).toContain("works/1/cover");
  });
});
