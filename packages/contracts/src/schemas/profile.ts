import { z } from "zod";

/** Profile edit payload. Handle is the public slug: 3–24 [a-z0-9_]. */
export const profileSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,24}$/, "3–24 caracteres: letras, números e _")
    .optional(),
  bio: z.string().trim().max(300).optional(),
});
