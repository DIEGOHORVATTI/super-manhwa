import { adminRouter } from "./routers/admin";
import { affiliateRouter } from "./routers/affiliate";
import { anilistRouter } from "./routers/anilist";
import { commentsRouter } from "./routers/comments";
import { donationsRouter } from "./routers/donations";
import { learnRouter } from "./routers/learn";
import { legalRouter } from "./routers/legal";
import { libraryRouter } from "./routers/library";
import { newsletterRouter } from "./routers/newsletter";
import { orgRouter } from "./routers/org";
import { pixelsRouter } from "./routers/pixels";
import { profileRouter } from "./routers/profile";
import { readingRouter } from "./routers/reading";
import { studioRouter } from "./routers/studio";

/**
 * The web platform's oRPC router | every stateful feature the Next app owns
 * (its own Postgres + Better Auth session), exposed as typed procedures. Mounted
 * at `/api/rpc` by `app/api/rpc/[...rest]/route.ts`; the browser calls it through
 * the typed client in `client.ts`. Webhooks, Better Auth, cron, email-link GETs
 * and multipart file uploads stay as plain route handlers by design (fixed URLs
 * hit by third parties / binary bodies).
 */
export const appRouter = {
  comments: commentsRouter,
  profile: profileRouter,
  reading: readingRouter,
  library: libraryRouter,
  newsletter: newsletterRouter,
  legal: legalRouter,
  anilist: anilistRouter,
  donations: donationsRouter,
  affiliate: affiliateRouter,
  studio: studioRouter,
  org: orgRouter,
  learn: learnRouter,
  pixels: pixelsRouter,
  admin: adminRouter,
};

export type AppRouter = typeof appRouter;
