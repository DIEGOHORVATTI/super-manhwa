import { describe, expect, it } from "bun:test";

import { coverSig, pageSig, signPagePath, verifyCover, verifyPage } from "../lib/image-sign-core";

const SECRET = "test-secret";
const TOKEN = "manga-tok-123";

describe("image-sign-core: cover (public) tags", () => {
  it("matches the cross-layer canonical vector (must equal the backend's coverSig)", () => {
    // If this changes, apps/backend/tests/unit/image-sign.test.ts breaks too —
    // that's the point: the two layers MUST agree byte-for-byte.
    expect(coverSig(TOKEN, SECRET)).toBe("tt0tqCcAiYJ3qS2RW1");
  });

  it("verifies a valid cover tag and rejects forged / missing ones", () => {
    const k = coverSig(TOKEN, SECRET);
    expect(verifyCover(TOKEN, k, SECRET)).toBe(true);
    expect(verifyCover(TOKEN, null, SECRET)).toBe(false);
    expect(verifyCover(TOKEN, "forged-tag", SECRET)).toBe(false);
    expect(verifyCover(TOKEN, k, "other-secret")).toBe(false);
    expect(verifyCover("other-token", k, SECRET)).toBe(false);
  });
});

describe("image-sign-core: page (session) tags", () => {
  it("matches the canonical page vector", () => {
    expect(pageSig(TOKEN, 1000, "sid-xyz", SECRET)).toBe("zDLy-V-BJeqQ_1pADA");
  });

  it("verifies a fresh page tag bound to the right session", () => {
    const now = 10_000;
    const exp = now + 100;
    const s = pageSig(TOKEN, exp, "sid-A", SECRET);
    expect(verifyPage(TOKEN, String(exp), s, "sid-A", now, SECRET)).toBe(true);
  });

  it("rejects a different session id (the copied-link guard)", () => {
    const now = 10_000;
    const exp = now + 100;
    const s = pageSig(TOKEN, exp, "sid-A", SECRET);
    expect(verifyPage(TOKEN, String(exp), s, "sid-B", now, SECRET)).toBe(false);
    expect(verifyPage(TOKEN, String(exp), s, "", now, SECRET)).toBe(false);
  });

  it("rejects an expired tag", () => {
    const exp = 10_000;
    const s = pageSig(TOKEN, exp, "sid-A", SECRET);
    expect(verifyPage(TOKEN, String(exp), s, "sid-A", exp + 1, SECRET)).toBe(false);
  });

  it("rejects missing / malformed inputs", () => {
    expect(verifyPage(TOKEN, null, "x", "sid", 1, SECRET)).toBe(false);
    expect(verifyPage(TOKEN, "abc", "x", "sid", 1, SECRET)).toBe(false);
  });

  it("signPagePath round-trips through verifyPage", () => {
    const now = 50_000;
    const path = signPagePath(`/api/img/${TOKEN}`, "sid-A", now, 7200, SECRET);
    const url = new URL(`http://x${path}`);
    expect(
      verifyPage(TOKEN, url.searchParams.get("e"), url.searchParams.get("s"), "sid-A", now, SECRET),
    ).toBe(true);
    // and is dead in another session
    expect(
      verifyPage(TOKEN, url.searchParams.get("e"), url.searchParams.get("s"), "sid-Z", now, SECRET),
    ).toBe(false);
  });
});
