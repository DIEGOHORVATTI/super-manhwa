import * as Sentry from "@sentry/nextjs";

/**
 * Server-side Sentry init (Node + Edge runtimes). Entirely gated on `SENTRY_DSN`
 * — unset → Sentry stays off and adds no overhead. No next.config wrapping, so
 * builds work without a DSN / Sentry auth token (source-map upload is opt-in
 * later).
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({ dsn, tracesSampleRate: 0.1 });
}

export const onRequestError = Sentry.captureRequestError;
