import { describe, expect, it } from "bun:test";

import { commentCreateSchema, voteSchema } from "../lib/schemas/community";

describe("commentCreateSchema", () => {
  const valid = { targetType: "work" as const, targetId: "abc123", body: "Olá!" };

  it("accepts a valid top-level comment", () => {
    expect(commentCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a reply with a positive parentId", () => {
    expect(commentCreateSchema.safeParse({ ...valid, parentId: 5 }).success).toBe(true);
    expect(commentCreateSchema.safeParse({ ...valid, parentId: null }).success).toBe(true);
  });

  it("rejects an invalid targetType", () => {
    expect(commentCreateSchema.safeParse({ ...valid, targetType: "page" }).success).toBe(false);
  });

  it("rejects empty / whitespace-only body and over-long body", () => {
    expect(commentCreateSchema.safeParse({ ...valid, body: "   " }).success).toBe(false);
    expect(commentCreateSchema.safeParse({ ...valid, body: "x".repeat(4001) }).success).toBe(false);
  });

  it("rejects a non-positive parentId", () => {
    expect(commentCreateSchema.safeParse({ ...valid, parentId: 0 }).success).toBe(false);
    expect(commentCreateSchema.safeParse({ ...valid, parentId: -1 }).success).toBe(false);
  });

  it("trims the body", () => {
    const parsed = commentCreateSchema.parse({ ...valid, body: "  hi  " });
    expect(parsed.body).toBe("hi");
  });
});

describe("voteSchema", () => {
  it("accepts -1, 0, 1", () => {
    for (const v of [-1, 0, 1]) expect(voteSchema.safeParse({ value: v }).success).toBe(true);
  });
  it("rejects out-of-range and non-integers", () => {
    expect(voteSchema.safeParse({ value: 2 }).success).toBe(false);
    expect(voteSchema.safeParse({ value: -2 }).success).toBe(false);
    expect(voteSchema.safeParse({ value: 0.5 }).success).toBe(false);
  });
});
