import { z } from "zod";

/**
 * Zod input schemas for the legal forms — the single source of truth for the
 * route validation (mirrors how the backend validates oRPC inputs). `hp` is the
 * honeypot: present in the shape so it parses, checked separately at the route.
 */
const honeypot = z.string().optional();

export const dmcaInputSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  work: z.string().min(1).max(300),
  urls: z.string().min(1).max(4000),
  details: z.string().max(4000).optional(),
  goodFaith: z.literal(true),
  accurate: z.literal(true),
  hp: honeypot,
});
export type DmcaInput = z.infer<typeof dmcaInputSchema>;

export const contactInputSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  subject: z.string().min(1).max(300),
  message: z.string().min(1).max(5000),
  hp: honeypot,
});
export type ContactInput = z.infer<typeof contactInputSchema>;
