import { z } from "zod";

/** Studio (user-works) validation, shared by routes + tests. */
export const workCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  synopsis: z.string().trim().max(2000).optional(),
});

export const workEditSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  synopsis: z.string().trim().max(2000).optional(),
  coverR2Key: z.string().optional(),
});

export const teamAddSchema = z.object({
  handle: z.string().trim().toLowerCase(),
  role: z.enum(["editor", "translator", "reviewer"]),
});

export const chapterActionSchema = z.object({
  action: z.enum(["submit", "schedule", "publish", "unpublish"]),
  scheduledAt: z.string().datetime().optional(),
  number: z.string().trim().optional(),
  title: z.string().trim().max(200).nullable().optional(),
});

export const reviewSchema = z.object({
  decision: z.enum(["approved", "changes_requested"]),
  note: z.string().trim().max(1000).optional(),
});

/** Title → unique-ish work slug base (accent-stripped, hyphenated, ≤60). */
export function slugifyWork(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "obra"
  );
}
