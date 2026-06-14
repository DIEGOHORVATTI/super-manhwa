import { describe, expect, it } from "bun:test";

import { donationCreateSchema } from "@packages/contracts";

describe("donationCreateSchema", () => {
  it("accepts a minimal valid amount (R$1)", () => {
    expect(donationCreateSchema.safeParse({ amountCents: 100 }).success).toBe(true);
  });

  it("accepts the max amount (R$5.000) with a message", () => {
    expect(donationCreateSchema.safeParse({ amountCents: 500000, message: "valeu!" }).success).toBe(
      true,
    );
  });

  it("rejects below R$1 and above R$5.000", () => {
    expect(donationCreateSchema.safeParse({ amountCents: 99 }).success).toBe(false);
    expect(donationCreateSchema.safeParse({ amountCents: 500001 }).success).toBe(false);
  });

  it("rejects non-integer cents", () => {
    expect(donationCreateSchema.safeParse({ amountCents: 100.5 }).success).toBe(false);
  });

  it("rejects an over-long message and a bad email", () => {
    expect(
      donationCreateSchema.safeParse({ amountCents: 100, message: "x".repeat(201) }).success,
    ).toBe(false);
    expect(donationCreateSchema.safeParse({ amountCents: 100, email: "nope" }).success).toBe(false);
  });
});
