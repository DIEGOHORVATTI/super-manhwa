import { z } from "zod";

/**
 * Single source of truth for environment variables (web app). Every `process.env`
 * read goes through `env` exported here | call sites never touch `process.env`
 * directly. Mirrors the backend's `src/config/env.ts`.
 *
 * Isomorphic by design: each variable is referenced as a literal `process.env.X`
 * (so Next can inline `NEXT_PUBLIC_*` into the client bundle); on the client the
 * server-only vars resolve to `undefined` | never leaked. Secrets are optional
 * (the app degrades gracefully: `dbEnabled`, `r2Enabled`, `emailEnabled`, …), so
 * parsing never throws when something isn't configured.
 */
const num = (def: number) => z.coerce.number().default(def);
const opt = z.string().optional();

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),

  // Database
  DATABASE_URL: opt,

  // Public site + services
  SITE_URL: opt,
  DELIVERY_SERVICE_URL: z.string().default("http://localhost:8787"),
  API_KEY: opt,
  CRON_SECRET: opt,
  IMAGE_SIGN_SECRET: opt,

  // Auth
  BETTER_AUTH_URL: opt,
  BETTER_AUTH_SECRET: opt,
  GOOGLE_CLIENT_ID: opt,
  GOOGLE_CLIENT_SECRET: opt,
  ANILIST_CLIENT_SECRET: opt,
  NEXT_PUBLIC_ANILIST_CLIENT_ID: opt,
  VERIFY_COOLDOWN_MINUTES: num(30),

  // E-mail
  RESEND_API_KEY: opt,
  MAIL_FROM: z.string().default("Super Manhwa <no-reply@supermanhwa.com>"),
  ADMIN_EMAIL: opt,

  // Cloudflare R2
  R2_ACCOUNT_ID: opt,
  R2_ENDPOINT: opt,
  R2_BUCKET: opt,
  R2_PUBLIC_URL: opt,
  R2_ACCESS_KEY_ID: opt,
  R2_SECRET_ACCESS_KEY: opt,

  // Payments
  MP_ACCESS_TOKEN: opt,

  // Pricing
  PIXEL_BLOCK_PRICE_CENTS: num(500),
  LEARN_PREMIUM_PRICE: num(14.9),
});

export const env = EnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  SITE_URL: process.env.SITE_URL,
  DELIVERY_SERVICE_URL: process.env.DELIVERY_SERVICE_URL,
  API_KEY: process.env.API_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
  IMAGE_SIGN_SECRET: process.env.IMAGE_SIGN_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  ANILIST_CLIENT_SECRET: process.env.ANILIST_CLIENT_SECRET,
  NEXT_PUBLIC_ANILIST_CLIENT_ID: process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID,
  VERIFY_COOLDOWN_MINUTES: process.env.VERIFY_COOLDOWN_MINUTES,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  MAIL_FROM: process.env.MAIL_FROM,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ENDPOINT: process.env.R2_ENDPOINT,
  R2_BUCKET: process.env.R2_BUCKET,
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN,
  PIXEL_BLOCK_PRICE_CENTS: process.env.PIXEL_BLOCK_PRICE_CENTS,
  LEARN_PREMIUM_PRICE: process.env.LEARN_PREMIUM_PRICE,
});

export type Env = typeof env;
