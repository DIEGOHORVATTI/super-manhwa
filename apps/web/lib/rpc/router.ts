import { commentsRouter } from "./routers/comments";

/**
 * The web platform's oRPC router — every stateful feature the Next app owns
 * (its own Postgres + Better Auth session), exposed as typed procedures. Mounted
 * at `/api/rpc` by `app/api/rpc/[...rest]/route.ts`; the browser calls it through
 * the typed client in `client.ts`. Webhooks, Better Auth, cron and email-link
 * GETs stay as plain route handlers by design (fixed URLs hit by third parties).
 */
export const appRouter = {
  comments: commentsRouter,
};

export type AppRouter = typeof appRouter;
