import { describe, expect, it } from "bun:test";

import { joinPublicUrl } from "../lib/r2";

describe("joinPublicUrl", () => {
  it("joins base and key with a single slash", () => {
    expect(joinPublicUrl("https://cdn.example.com", "works/1/cover.jpg")).toBe(
      "https://cdn.example.com/works/1/cover.jpg",
    );
  });

  it("normalizes a trailing slash on the base", () => {
    expect(joinPublicUrl("https://cdn.example.com/", "a.jpg")).toBe("https://cdn.example.com/a.jpg");
  });

  it("normalizes a leading slash on the key", () => {
    expect(joinPublicUrl("https://cdn.example.com", "/a.jpg")).toBe("https://cdn.example.com/a.jpg");
  });

  it("normalizes both at once (no double slash)", () => {
    expect(joinPublicUrl("https://cdn.example.com/", "/nested/a.jpg")).toBe(
      "https://cdn.example.com/nested/a.jpg",
    );
  });
});
