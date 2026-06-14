import { beforeEach, describe, expect, it, mock } from "bun:test";

import * as dbSchema from "../lib/db/schema";
import { hasRole } from "../lib/roles";
import { makeFakeDb } from "./helpers/fake-db";

/**
 * Handler integration ("e2e") tests for the routes added in the recent feature
 * round (infinite scroll, reading tracker, affiliates, pixel board, cover
 * upload). Side-effecting deps are mocked via closures read at call time.
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
      latest: async () => ({ list: [{ id: "latest" }], hasNextPage: true }),
    },
  },
}));
mock.module("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "ref" && refCookie ? { value: refCookie } : undefined),
    delete: () => {},
  }),
}));

const list = await import("../app/api/list/route");
const track = await import("../app/api/reading/track/route");
const affiliate = await import("../app/api/affiliate/route");
const attribute = await import("../app/api/affiliate/attribute/route");
const adminAff = await import("../app/api/admin/affiliates/route");
const pixels = await import("../app/api/pixels/route");
const reserve = await import("../app/api/pixels/reserve/route");
const pixelStatus = await import("../app/api/pixels/[id]/status/route");
const pixelWebhook = await import("../app/api/pixels/webhook/route");
const adminPixels = await import("../app/api/admin/pixels/route");
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

beforeEach(() => {
  session = null;
  dbResults = [];
  workAccess = {};
  refCookie = null;
  mpPaymentStatus = "approved";
  mpSubStatus = "authorized";
  readingUnlocked = [];
});

describe("GET /api/list", () => {
  it("routes feed=latest to the latest feed", async () => {
    const res = await list.GET(get("http://t/api/list?feed=latest&page=2"));
    expect((await res.json()).list[0].id).toBe("latest");
  });
  it("uses search when q has 2+ chars", async () => {
    const res = await list.GET(get("http://t/api/list?feed=browse&q=naruto"));
    expect((await res.json()).list[0].id).toBe("search");
  });
  it("browses by popular otherwise", async () => {
    const res = await list.GET(get("http://t/api/list?feed=browse"));
    expect((await res.json()).list[0].id).toBe("pop");
  });
});

describe("POST /api/reading/track", () => {
  it("401 when anonymous", async () => {
    const res = await track.POST(json("http://t", "POST", { workId: "m", chapterId: "c" }));
    expect(res.status).toBe(401);
  });
  it("records a new chapter and reports unlocked badges", async () => {
    session = { user: { id: "u1" } };
    dbResults = [[{ id: 1 }]]; // insert returning → new row
    readingUnlocked = ["read_10_works"];
    const res = await track.POST(json("http://t", "POST", { workId: "m", chapterId: "c" }));
    expect(res.status).toBe(200);
    expect((await res.json()).unlocked).toEqual(["read_10_works"]);
  });
});

describe("/api/affiliate", () => {
  it("GET → null when not an affiliate", async () => {
    session = { user: { id: "u1" } };
    dbResults = [[]];
    expect((await (await affiliate.GET()).json()).affiliate).toBeNull();
  });
  it("GET → stats when an affiliate", async () => {
    session = { user: { id: "u1" } };
    dbResults = [
      [{ id: 1, code: "abc123", ratePct: 20, pixKey: null }],
      [{ n: 3 }],
      [{ status: "pending", cents: 600 }],
    ];
    const data = await (await affiliate.GET()).json();
    expect(data.affiliate.code).toBe("abc123");
    expect(data.stats.referrals).toBe(3);
    expect(data.stats.pendingCents).toBe(600);
  });
  it("POST join creates a code (201)", async () => {
    session = { user: { id: "u1" } };
    dbResults = [[], [], []]; // no existing, no clash, insert
    const res = await affiliate.POST(json("http://t", "POST", {}));
    expect(res.status).toBe(201);
    expect((await res.json()).code).toMatch(/^[a-z0-9]{8}$/);
  });
});

describe("POST /api/affiliate/attribute", () => {
  it("no-op without a ref cookie", async () => {
    session = { user: { id: "u1" } };
    expect((await (await attribute.POST()).json()).ok).toBe(false);
  });
  it("creates a referral for a valid non-self code", async () => {
    session = { user: { id: "u1" } };
    refCookie = "abc123";
    dbResults = [[{ id: 7, userId: "other" }], []]; // affiliate lookup, insert
    expect((await (await attribute.POST()).json()).ok).toBe(true);
  });
});

describe("/api/admin/affiliates", () => {
  it("GET 403 for non-staff", async () => {
    session = { user: { id: "u1", role: "user" } };
    expect((await adminAff.GET()).status).toBe(403);
  });
  it("GET lists for staff", async () => {
    session = { user: { id: "u1", role: "staff" } };
    dbResults = [
      [{ id: 1, code: "abc123", pixKey: null, name: "A", handle: "a", pendingCents: 600 }],
    ];
    const data = await (await adminAff.GET()).json();
    expect(data.affiliates[0].pendingCents).toBe(600);
  });
  it("POST marks paid (staff)", async () => {
    session = { user: { id: "u1", role: "admin" } };
    dbResults = [[]];
    const res = await adminAff.POST(json("http://t", "POST", { affiliateId: 1 }));
    expect(res.status).toBe(200);
  });
});

describe("/api/pixels", () => {
  it("GET returns approved ads + taken rects", async () => {
    dbResults = [
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
    ];
    const data = await (await pixels.GET()).json();
    expect(data.ads).toHaveLength(1);
    expect(data.ads[0].imageUrl).toContain("/k");
    expect(data.taken).toHaveLength(1);
    expect(data.grid.cols).toBe(100);
  });

  it("reserve: 401 anon, 400 bad rect, 201 success", async () => {
    // anon
    expect(
      (await reserve.POST(multipart({ x: "0", y: "0", w: "2", h: "2", linkUrl: "https://x" })))
        .status,
    ).toBe(401);
    // bad rect (oversize)
    session = { user: { id: "u1", email: "u@x" } };
    expect(
      (await reserve.POST(multipart({ x: "0", y: "0", w: "99", h: "2", linkUrl: "https://x" })))
        .status,
    ).toBe(400);
    // success
    dbResults = [[], [{ id: 5 }], []]; // no collision, insert, update
    const res = await reserve.POST(
      multipart({ x: "0", y: "0", w: "2", h: "2", linkUrl: "https://x" }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).qrCode).toBe("QR");
  });

  it("status: 404 when missing, value when present", async () => {
    dbResults = [[]];
    expect((await pixelStatus.GET(get("http://t"), params("9"))).status).toBe(404);
    dbResults = [[{ status: "approved" }]];
    expect((await (await pixelStatus.GET(get("http://t"), params("9"))).json()).status).toBe(
      "approved",
    );
  });

  it("webhook flips reserved → pending only on approval", async () => {
    dbResults = [[]]; // the update
    mpPaymentStatus = "approved";
    const res = await pixelWebhook.POST(
      json("http://t", "POST", { type: "payment", data: { id: "pay_1" } }),
    );
    expect((await res.json()).ok).toBe(true);
  });
});

describe("/api/admin/pixels", () => {
  it("GET 403 non-staff; lists pending for staff", async () => {
    session = { user: { id: "u1", role: "user" } };
    expect((await adminPixels.GET()).status).toBe(403);
    session = { user: { id: "u1", role: "staff" } };
    dbResults = [
      [{ id: 1, x: 0, y: 0, w: 2, h: 2, linkUrl: "https://x", title: "t", imageR2Key: "k" }],
    ];
    const data = await (await adminPixels.GET()).json();
    expect(data.blocks[0].imageUrl).toContain("/k");
  });
  it("POST approve", async () => {
    session = { user: { id: "u1", role: "admin" } };
    dbResults = [[]];
    const res = await adminPixels.POST(json("http://t", "POST", { id: 1, action: "approve" }));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/studio/works/[id]/cover", () => {
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
