import type { HTTPPath } from "@orpc/client";
import type { AnyRouter } from "@orpc/server";
import { serve } from "bun";

import { isProduction } from "@/config/env";
import { logger } from "@/shared/logger";

import { createRpcHandler, type OpenAPIInfo } from "./create-rpc-handler";
import { createDefaultSecurityHeaders } from "./security";

/**
 * A request handler that either claims the request (returning a Response) or
 * declines (returning null/undefined), letting the chain move on. Used for raw
 * routes that sit outside the oRPC dispatch | in our case `/api/img/<token>`.
 */
export type FetchHandler = (
  req: Request,
) => Response | null | undefined | Promise<Response | null | undefined>;

export type StartBunServerOptions<TContext> = {
  port: number;
  hostname?: string;
  /** Origin(s) allowed by CORS. Pass `*` for fully public APIs. */
  publicUrl: string | string[];
  /** Shown on the server banner + the OpenAPI docs page. */
  info: OpenAPIInfo;
  /** Where Scalar docs are served (when `exposeDocs` is true). */
  docsPath?: HTTPPath;
  exposeDocs?: boolean;
  /** Stripped from the URL pathname before oRPC dispatch (contracts stay path-relative). */
  prefix?: string;
  router: AnyRouter;
  createContext: (req: Request) => TContext;
  securityHeaders?: Record<string, string>;
  /** Run before any routing (e.g. metrics, body limits). */
  beforeHandlers?: FetchHandler[];
  /** Run after auth but before oRPC dispatch (e.g. binary streams). */
  customHandlers?: FetchHandler[];
  notFoundBody?: unknown;
  /**
   * Seconds Bun keeps an idle connection open before resetting it (max 255).
   * The detail route fans out across several reading connectors (some via
   * FlareSolverr) on a cold cache, which can exceed Bun's 10s default and drop
   * the connection mid-request | so we raise it well above that.
   */
  idleTimeout?: number;
  initialize?: () => Promise<void> | void;
  onListen?: () => Promise<void> | void;
};

const DEFAULT_NOT_FOUND = { error: "Route not found" };

/**
 * Single-call Bun server bootstrap. The whole "build OpenAPIHandler, wrap in
 * Bun.serve, dispatch /api/img before oRPC, add security headers" dance lives
 * here, so the entry point (`src/index.ts`) becomes a few-line configuration.
 * Request logging lives in the oRPC interceptor (`create-rpc-handler`), so the
 * raw `/api/img` streams that bypass dispatch stay out of the log by design.
 *
 * Mirrors `novo-horizonte/server/src/http/orpc-server.ts`.
 */
export const startBunServer = async <TContext>({
  port,
  hostname = "0.0.0.0",
  publicUrl,
  info,
  docsPath,
  exposeDocs,
  prefix,
  router,
  createContext,
  securityHeaders = createDefaultSecurityHeaders({ production: isProduction }),
  beforeHandlers = [],
  customHandlers = [],
  notFoundBody = DEFAULT_NOT_FOUND,
  idleTimeout = 120,
  initialize,
  onListen,
}: StartBunServerOptions<TContext>): Promise<ReturnType<typeof serve>> => {
  await initialize?.();

  const rpcHandler = createRpcHandler({
    router,
    allowedOrigins: publicUrl,
    info,
    docsPath,
    exposeDocs,
  });

  const stripPrefix = prefix
    ? (req: Request) => {
        const url = new URL(req.url);
        if (!url.pathname.startsWith(prefix)) return req;
        url.pathname = url.pathname.slice(prefix.length) || "/";
        return new Request(url, req);
      }
    : (req: Request) => req;

  const server = serve({
    port,
    hostname,
    idleTimeout,
    async fetch(req: Request): Promise<Response> {
      // Raw handlers (`/api/img`, favicon) claim the request before oRPC dispatch.
      for (const handler of [...beforeHandlers, ...customHandlers]) {
        const response = await handler(req);
        if (response) return response;
      }

      // oRPC dispatch | the interceptor in `create-rpc-handler` logs these.
      const { matched, response } = await rpcHandler.handle(stripPrefix(req), {
        context: createContext(req),
      });
      if (matched && response) {
        for (const [k, v] of Object.entries(securityHeaders)) response.headers.set(k, v);
        return response;
      }
      return Response.json(notFoundBody, { status: 404 });
    },
  });

  logger.info(`server up`, {
    url: `http://${hostname}:${port}`,
    version: info.version,
    docs: exposeDocs && docsPath ? `${prefix ?? ""}${docsPath}` : undefined,
  });

  await onListen?.();
  return server;
};
