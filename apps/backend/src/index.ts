import { APP_INFO } from "@/config/app";
import { env } from "@/config/env";
import { startBunServer } from "@/http";
import { imageRoute } from "@/modules/media/presentation/routes/image-routes";
import { faviconRoute } from "@/modules/system/presentation/routes/favicon-routes";
import { router } from "@/router";

/**
 * Delivery service entrypoint. The whole "build OpenAPIHandler, wire CORS,
 * dispatch /api/img before oRPC, attach security headers" dance lives inside
 * `startBunServer` (in `http/`) | this file is pure configuration, mirroring
 * `remarketing/apps/backend/src/server.ts`.
 */
await startBunServer({
  port: env.PORT,
  publicUrl: env.CORS_ORIGIN,
  prefix: "/api",
  info: {
    title: APP_INFO.title,
    version: APP_INFO.version,
    description: APP_INFO.description,
    contact: APP_INFO.contact,
  },
  docsPath: "/docs",
  exposeDocs: env.EXPOSE_DOCS,
  router,
  // Per-request context | every handler reads `reqHeaders` (the apiKeyMiddleware
  // needs it). resHeaders is a place for handlers to set response headers.
  createContext: (req) => ({
    reqHeaders: req.headers,
    resHeaders: new Headers(),
  }),
  // Raw routes | bypass oRPC, run before dispatch. The image proxy enforces the
  // same X-API-KEY guard as the oRPC routes (defense in depth). Health is NOT
  // here: it lives as a public oRPC route (`pub.health` in the contract) so
  // Docker / probes hit `/api/health` and get the versioned health payload.
  customHandlers: [faviconRoute, imageRoute],
});
