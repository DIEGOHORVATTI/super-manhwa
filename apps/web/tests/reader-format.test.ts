import { describe, expect, it } from "bun:test";

import { shouldOpenNovel } from "../lib/reader-format";

describe("shouldOpenNovel", () => {
  it("trusts the chapter's own format when it carries one", () => {
    expect(shouldOpenNovel("novel", undefined)).toBe(true);
    expect(shouldOpenNovel("manga", "novel")).toBe(false); // chapter format wins over work
    expect(shouldOpenNovel("manhwa", undefined)).toBe(false);
  });

  it("falls back to the work format when the chapter has none", () => {
    expect(shouldOpenNovel(undefined, "novel")).toBe(true);
    expect(shouldOpenNovel(null, "novel")).toBe(true);
    expect(shouldOpenNovel("", "novel")).toBe(true);
    expect(shouldOpenNovel(undefined, undefined)).toBe(false);
    expect(shouldOpenNovel(undefined, "manga")).toBe(false);
  });

  it("ignores an unknown chapter format and uses the work format", () => {
    expect(shouldOpenNovel("bogus", "novel")).toBe(true);
    expect(shouldOpenNovel("bogus", undefined)).toBe(false);
  });
});
