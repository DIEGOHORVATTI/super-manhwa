import { describe, expect, it } from "bun:test";

import { coverSig, signCoverPath } from "@/shared/image-sign";

const SECRET = "test-secret";
const TOKEN = "manga-tok-123";

describe("backend coverSig (public-cover signature)", () => {
  it("matches the cross-layer canonical vector (must equal the web's coverSig)", () => {
    // Locked to apps/web/tests/image-sign-core.test.ts | the Next proxy verifies
    // exactly this tag, so the two implementations must never drift.
    expect(coverSig(TOKEN, SECRET)).toBe("tt0tqCcAiYJ3qS2RW1");
  });

  it("is deterministic and sensitive to token + secret", () => {
    expect(coverSig(TOKEN, SECRET)).toBe(coverSig(TOKEN, SECRET));
    expect(coverSig("other", SECRET)).not.toBe(coverSig(TOKEN, SECRET));
    expect(coverSig(TOKEN, "other")).not.toBe(coverSig(TOKEN, SECRET));
  });

  it("signCoverPath appends ?k= over the token portion only", () => {
    const signed = signCoverPath(`/api/img/${TOKEN}`);
    const url = new URL(`http://x${signed}`);
    expect(url.pathname).toBe(`/api/img/${TOKEN}`);
    expect(url.searchParams.get("k")).toBe(coverSig(TOKEN));
  });
});
