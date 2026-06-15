import { describe, expect, it } from "bun:test";

import { contactInputSchema, dmcaInputSchema } from "@packages/contracts";
import { subscribeInputSchema } from "@packages/contracts";

describe("dmcaInputSchema", () => {
  const valid = {
    name: "Acme",
    email: "a@b.com",
    work: "Some Work",
    urls: "https://x/manga/1",
    goodFaith: true,
    accurate: true,
  };

  it("accepts a complete valid submission", () => {
    expect(dmcaInputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a bad email", () => {
    expect(dmcaInputSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
  });

  it("requires the declarations to be literally true", () => {
    expect(dmcaInputSchema.safeParse({ ...valid, goodFaith: false }).success).toBe(false);
    expect(dmcaInputSchema.safeParse({ ...valid, accurate: undefined }).success).toBe(false);
  });

  it("rejects empty required fields", () => {
    expect(dmcaInputSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
    expect(dmcaInputSchema.safeParse({ ...valid, urls: "" }).success).toBe(false);
  });
});

describe("contactInputSchema", () => {
  it("accepts valid and rejects missing fields", () => {
    const valid = { name: "X", email: "a@b.com", subject: "Hi", message: "Hello there" };
    expect(contactInputSchema.safeParse(valid).success).toBe(true);
    expect(contactInputSchema.safeParse({ ...valid, message: "" }).success).toBe(false);
    expect(contactInputSchema.safeParse({ ...valid, email: "x" }).success).toBe(false);
  });
});

describe("subscribeInputSchema", () => {
  it("validates the e-mail", () => {
    expect(subscribeInputSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
    expect(subscribeInputSchema.safeParse({ email: "x" }).success).toBe(false);
    expect(subscribeInputSchema.safeParse({}).success).toBe(false);
  });
});
