import { describe, expect, it } from "bun:test";

import {
  chapterActionSchema,
  reviewSchema,
  slugifyWork,
  teamAddSchema,
  workCreateSchema,
} from "../lib/schemas/studio";

describe("workCreateSchema", () => {
  it("accepts a title (with optional synopsis)", () => {
    expect(workCreateSchema.safeParse({ title: "Minha Obra" }).success).toBe(true);
    expect(workCreateSchema.safeParse({ title: "X", synopsis: "abc" }).success).toBe(true);
  });
  it("rejects empty/over-long titles", () => {
    expect(workCreateSchema.safeParse({ title: "" }).success).toBe(false);
    expect(workCreateSchema.safeParse({ title: "x".repeat(121) }).success).toBe(false);
  });
});

describe("teamAddSchema", () => {
  it("accepts the three assignable roles and lowercases the handle", () => {
    for (const role of ["editor", "translator", "reviewer"]) {
      expect(teamAddSchema.safeParse({ handle: "User", role }).success).toBe(true);
    }
    expect(teamAddSchema.parse({ handle: "User", role: "editor" }).handle).toBe("user");
  });
  it("rejects assigning the owner role via the API", () => {
    expect(teamAddSchema.safeParse({ handle: "x", role: "owner" }).success).toBe(false);
  });
});

describe("chapterActionSchema", () => {
  it("accepts each lifecycle action", () => {
    for (const action of ["submit", "schedule", "publish", "unpublish"]) {
      expect(chapterActionSchema.safeParse({ action }).success).toBe(true);
    }
  });
  it("accepts an ISO scheduledAt and rejects a bad one", () => {
    expect(
      chapterActionSchema.safeParse({ action: "schedule", scheduledAt: "2030-01-01T00:00:00Z" })
        .success,
    ).toBe(true);
    expect(
      chapterActionSchema.safeParse({ action: "schedule", scheduledAt: "amanhã" }).success,
    ).toBe(false);
  });
  it("rejects an unknown action", () => {
    expect(chapterActionSchema.safeParse({ action: "delete" }).success).toBe(false);
  });
});

describe("reviewSchema", () => {
  it("accepts the two decisions", () => {
    expect(reviewSchema.safeParse({ decision: "approved" }).success).toBe(true);
    expect(reviewSchema.safeParse({ decision: "changes_requested", note: "fix" }).success).toBe(true);
  });
  it("rejects an unknown decision", () => {
    expect(reviewSchema.safeParse({ decision: "maybe" }).success).toBe(false);
  });
});

describe("slugifyWork", () => {
  it("strips accents, lowercases and hyphenates", () => {
    expect(slugifyWork("Coração de Ferro")).toBe("coracao-de-ferro");
  });
  it("trims leading/trailing separators and clamps length", () => {
    expect(slugifyWork("  !!Olá!!  ")).toBe("ola");
    expect(slugifyWork("a".repeat(80)).length).toBeLessThanOrEqual(60);
  });
  it("falls back to 'obra' when nothing remains", () => {
    expect(slugifyWork("!!!")).toBe("obra");
    expect(slugifyWork("")).toBe("obra");
  });
});
