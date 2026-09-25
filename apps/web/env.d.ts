/**
 * Type-safe `process.env` for the web app. Prefer importing the validated `env`
 * object from `@/lib/env`; this declaration just makes any raw `process.env.X`
 * access (e.g. in `lib/env.ts`, `proxy.ts`, `drizzle.config.ts`) typed instead
 * of `string | undefined` with no key checking.
 *
 * Env vars are always `string | undefined` at runtime | coercion to numbers etc.
 * happens in `lib/env.ts`.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "development" | "production" | "test";

    // Database
    DATABASE_URL?: string;

    // Site + services
    SITE_URL?: string;
    CRON_SECRET?: string;
    FLARESOLVERR_URL?: string;

    // Auth
    BETTER_AUTH_URL?: string;
    BETTER_AUTH_API_KEY?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    ANILIST_CLIENT_SECRET?: string;
    NEXT_PUBLIC_ANILIST_CLIENT_ID?: string;
    VERIFY_COOLDOWN_MINUTES?: string;

    // E-mail
    RESEND_API_KEY?: string;
    MAIL_FROM?: string;
    ADMIN_EMAIL?: string;

    // Cloudflare R2
    R2_ACCOUNT_ID?: string;
    R2_ENDPOINT?: string;
    R2_BUCKET?: string;
    R2_PUBLIC_URL?: string;
    R2_ACCESS_KEY_ID?: string;
    R2_SECRET_ACCESS_KEY?: string;

    // Payments
    MP_ACCESS_TOKEN?: string;

    // Pricing
    PIXEL_BLOCK_PRICE_CENTS?: string;
    LEARN_PREMIUM_PRICE?: string;
  }
}
