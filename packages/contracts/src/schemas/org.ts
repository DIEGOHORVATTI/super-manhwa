import { z } from "zod";

import { slugifyWork } from "./studio";

/**
 * Organização (a public scanlation group / studio) validation. An Organização is
 * a team with a public identity: a slug, a roster of members with roles, and the
 * works published under it. Shared by the web RPC procedures + tests.
 */

/** Slug: lowercase, hyphenated, 3–40 chars. Reuses the work slugifier. */
export const orgSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens.");

/** Title → slug base (≤40), reusing the work slugifier then clamping. */
export function slugifyOrg(s: string): string {
  return slugifyWork(s).slice(0, 40) || "org";
}

export const orgCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const orgUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(1000).nullable().optional(),
  slug: orgSlugSchema.optional(),
  isPublic: z.boolean().optional(),
});

/** Roles a member can hold (owner is implicit via teams.ownerId). */
export const orgMemberRoleSchema = z.enum(["editor", "translator", "reviewer"]);

export const orgMemberAddSchema = z.object({
  handle: z.string().trim().toLowerCase(),
  role: orgMemberRoleSchema,
});
