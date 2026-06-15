import { describe, expect, it } from "bun:test";

import { apiClient } from "../helpers/api-client";

describe("media / image proxy", () => {
  it("returns real image bytes for a valid token via /api/img/<token>", async () => {
    const popular = await apiClient.manga.popular();
    const withImage = popular.list.find((m) => m.imageUrl);
    expect(withImage).toBeDefined();
    const token = (withImage as { imageUrl: string }).imageUrl.split("/").pop()!;

    const res = await apiClient.image(token);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^image\//);
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes.byteLength).toBeGreaterThan(1000); // anything bigger than a stub
    // JPEG / PNG / WebP magic bytes check
    const looksLikeImage =
      (bytes[0] === 0xff && bytes[1] === 0xd8) || // JPEG
      (bytes[0] === 0x89 && bytes[1] === 0x50) || // PNG
      (bytes[0] === 0x52 && bytes[1] === 0x49); // RIFF (WebP)
    expect(looksLikeImage).toBe(true);
  });

  it("rejects requests without the API key", async () => {
    const res = await apiClient.image("any-token", { withKey: false });
    expect(res.status).toBe(401);
  });

  it("rejects invalid tokens", async () => {
    const res = await apiClient.image("definitely-not-a-real-token");
    // Either 400 (bad token decode) or 404/500 from upstream | but never 200.
    expect(res.status).not.toBe(200);
  });
});
