import { z } from "zod";

export const subscribeInputSchema = z.object({
  email: z.string().email().max(200),
  hp: z.string().optional(), // honeypot
});
export type SubscribeInput = z.infer<typeof subscribeInputSchema>;
