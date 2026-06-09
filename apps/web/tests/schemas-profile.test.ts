import { describe, expect, it } from "bun:test";

import { profileSchema } from "../lib/schemas/profile";

describe("profileSchema", () => {
  it("accepts valid name/handle/bio", () => {
    expect(profileSchema.safeParse({ name: "Diego", handle: "diego_99", bio: "olá" }).success).toBe(
      true,
    );
  });

  it("lowercases the handle", () => {
    expect(profileSchema.parse({ handle: "DiegoH" }).handle).toBe("diegoh");
  });

  it("rejects handles that are too short/long or have bad chars", () => {
    expect(profileSchema.safeParse({ handle: "ab" }).success).toBe(false);
    expect(profileSchema.safeParse({ handle: "a".repeat(25) }).success).toBe(false);
    expect(profileSchema.safeParse({ handle: "tem espaço" }).success).toBe(false);
    expect(profileSchema.safeParse({ handle: "ponto.com" }).success).toBe(false);
  });

  it("rejects an empty name and an over-long bio", () => {
    expect(profileSchema.safeParse({ name: "" }).success).toBe(false);
    expect(profileSchema.safeParse({ bio: "x".repeat(301) }).success).toBe(false);
  });

  it("allows a fully empty patch (all optional)", () => {
    expect(profileSchema.safeParse({}).success).toBe(true);
  });
});
