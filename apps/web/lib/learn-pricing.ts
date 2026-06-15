import { env } from "@/lib/env";

/** Premium monthly price (BRL). Override via LEARN_PREMIUM_PRICE; default R$14,90. */
export const PREMIUM_PRICE_BRL = Number(env.LEARN_PREMIUM_PRICE);

export const PREMIUM_PRICE_CENTS = Math.round(PREMIUM_PRICE_BRL * 100);
