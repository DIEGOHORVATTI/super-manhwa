import { describe, expect, it } from "bun:test";

import {
  orgCreateSchema,
  orgMemberAddSchema,
  orgSlugSchema,
  orgUpdateSchema,
  slugifyOrg,
} from "@packages/contracts";

describe("slugifyOrg", () => {
  it("strips accents/symbols and produces a valid slug ≤40", () => {
    expect(slugifyOrg("Lua Cheia Scans")).toBe("lua-cheia-scans");
    expect(slugifyOrg("Tradução Ação!!!")).toBe("traducao-acao");
    expect(slugifyOrg("x".repeat(60)).length).toBeLessThanOrEqual(40);
    // whatever it returns must satisfy the public slug rules
    expect(orgSlugSchema.safeParse(slugifyOrg("Açaí & Cia")).success).toBe(true);
  });
});

describe("orgSlugSchema", () => {
  it("accepts lowercase hyphenated slugs", () => {
    expect(orgSlugSchema.safeParse("lua-cheia").success).toBe(true);
  });
  it("normalizes uppercase to lowercase", () => {
    expect(orgSlugSchema.parse("LuaCheia")).toBe("luacheia");
  });
  it("rejects spaces, leading/trailing hyphens and out-of-range length", () => {
    for (const bad of ["lua cheia", "-lua", "lua-", "ab", "a".repeat(41)]) {
      expect(orgSlugSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("orgCreateSchema / orgUpdateSchema", () => {
  it("create needs a 2–80 char name", () => {
    expect(orgCreateSchema.safeParse({ name: "OK" }).success).toBe(true);
    expect(orgCreateSchema.safeParse({ name: "x" }).success).toBe(false);
  });
  it("update accepts partial fields incl. nullable bio", () => {
    expect(orgUpdateSchema.safeParse({}).success).toBe(true);
    expect(orgUpdateSchema.safeParse({ bio: null, isPublic: true }).success).toBe(true);
    expect(orgUpdateSchema.safeParse({ slug: "Bad Slug" }).success).toBe(false);
  });
});

describe("orgMemberAddSchema", () => {
  it("lowercases handle and rejects the owner role", () => {
    expect(orgMemberAddSchema.parse({ handle: "User", role: "translator" }).handle).toBe("user");
    expect(orgMemberAddSchema.safeParse({ handle: "x", role: "owner" }).success).toBe(false);
  });
});
