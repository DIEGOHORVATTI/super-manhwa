import { z } from "zod";

/** Donation creation payload. Amount is in cents: R$1 – R$5.000. */
export const donationCreateSchema = z.object({
  amountCents: z.number().int().min(100).max(5_000_00),
  message: z.string().trim().max(200).optional(),
  email: z.string().email().optional(),
  /** Public display name for the donations wall (optional). */
  name: z.string().trim().max(40).optional(),
});
