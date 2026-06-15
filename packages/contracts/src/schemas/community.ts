import { z } from "zod";

/** Validation for the native comments API. Shared by routes + tests. */
export const targetTypeSchema = z.enum(["work", "chapter"]);

export const commentCreateSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().min(1).max(256),
  parentId: z.number().int().positive().nullable().optional(),
  body: z.string().trim().min(1).max(4000),
});

export const commentEditSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const voteSchema = z.object({
  value: z.number().int().min(-1).max(1),
});
