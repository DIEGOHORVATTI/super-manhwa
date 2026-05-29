import { describe, expect, it } from "bun:test";

import { makeImageByteCache } from "@/modules/media/infrastructure/image-byte-cache";

const img = (n: number) => ({ body: new ArrayBuffer(n), contentType: "image/jpeg" });

describe("image byte cache", () => {
  it("stores and returns bytes by key", () => {
    const c = makeImageByteCache();
    c.set("a", img(10));
    const hit = c.get("a");
    expect(hit?.body.byteLength).toBe(10);
    expect(hit?.contentType).toBe("image/jpeg");
    expect(c.get("missing")).toBeUndefined();
  });

  it("skips items larger than the per-item cap", () => {
    const c = makeImageByteCache({ maxItemBytes: 100 });
    c.set("big", img(200));
    expect(c.get("big")).toBeUndefined();
  });

  it("evicts least-recently-used entries once the total cap is exceeded", () => {
    const c = makeImageByteCache({ maxBytes: 250, maxItemBytes: 1000 });
    c.set("a", img(100));
    c.set("b", img(100));
    // Touch "a" so "b" becomes the LRU victim.
    expect(c.get("a")?.body.byteLength).toBe(100);
    c.set("c", img(100)); // total would be 300 > 250 → evict LRU ("b")
    expect(c.get("a")).toBeDefined();
    expect(c.get("c")).toBeDefined();
    expect(c.get("b")).toBeUndefined();
  });

  it("expires entries after the TTL", async () => {
    const c = makeImageByteCache({ ttlMs: 5 });
    c.set("a", img(10));
    expect(c.get("a")).toBeDefined();
    await new Promise((r) => setTimeout(r, 10));
    expect(c.get("a")).toBeUndefined();
  });
});
