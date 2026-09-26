import { z } from "zod";

/** Validation for the language-learning routes. */
export const wordStatusSchema = z.object({
  language: z.enum(["pt", "en"]),
  lemma: z.string().trim().min(1).max(64).toLowerCase(),
  status: z.enum(["new", "learning", "known", "ignored"]),
});

/** A word tapped in the English reader, with its sentence (for the cloze card) and meaning. */
export const saveWordSchema = z.object({
  word: z.string().trim().min(1).max(64),
  sentence: z.string().trim().min(1).max(1000),
  meaning: z.string().trim().max(200).optional(),
});

export const reviewGradeSchema = z.object({
  cardId: z.number().int().positive(),
  rating: z.number().int().min(1).max(4),
});

export const mineSentenceSchema = z.object({
  sentenceId: z.number().int().positive(),
  note: z.string().trim().min(1).max(500),
});

export const dailyGoalSchema = z.object({
  dailyGoal: z.number().int().min(5).max(500),
});
