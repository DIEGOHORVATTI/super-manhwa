import * as Sentry from "@sentry/nextjs";

/**
 * Client-side Sentry init, gated on `NEXT_PUBLIC_SENTRY_DSN`. Unset → no-op.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({ dsn, tracesSampleRate: 0.1, replaysSessionSampleRate: 0 });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
