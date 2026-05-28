import type { HTTPPath } from "@orpc/client";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import type { AnyRouter } from "@orpc/server";
import { CORSPlugin, RequestHeadersPlugin, ResponseHeadersPlugin } from "@orpc/server/plugins";
import { ZodSmartCoercionPlugin } from "@orpc/zod";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";

import { logger } from "@/shared/logger";

/**
 * Minimal OpenAPI info shape — keeps us off the `openapi-types` dependency
 * while still feeding the docs page. Same fields the reference plugin reads.
 */
export type OpenAPIInfo = {
  title: string;
  version: string;
  description?: string;
  contact?: { name?: string; email?: string; url?: string };
};

export type CreateRpcHandlerOptions = {
  router: AnyRouter;
  allowedOrigins: string | string[];
  info: OpenAPIInfo;
  docsPath?: HTTPPath;
  exposeDocs?: boolean;
};

/**
 * Builds the `OpenAPIHandler` with every plugin we want everywhere — CORS, body
 * coercion, headers, optional docs — and a single interceptor that logs each
 * request with timing. Lifted from `novo-horizonte/server/src/http/create-rpc-randler.ts`
 * (typo "randler" → "handler" intentionally fixed).
 */
export const createRpcHandler = ({
  router, allowedOrigins, info, docsPath = "/docs", exposeDocs = true,
}: CreateRpcHandlerOptions) =>
  new OpenAPIHandler(router, {
    plugins: [
      new CORSPlugin({
        origin: allowedOrigins,
        credentials: true,
        allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
        maxAge: 86_400,
      }),
      new RequestHeadersPlugin(),
      new ResponseHeadersPlugin(),
      new ZodSmartCoercionPlugin(),
      ...(exposeDocs ? [
        new OpenAPIReferencePlugin({
          docsProvider: "scalar",
          docsPath,
          schemaConverters: [new ZodToJsonSchemaConverter()],
          specGenerateOptions: { servers: [{ url: "/" }], info },
        }),
      ] : []),
    ],
    interceptors: [
      async ({ request: { method, url }, next }) => {
        const { pathname } = new URL(url);
        const startedAt = performance.now();
        try {
          const result = await next();
          logger.info("rpc", {
            method, path: pathname,
            ms: Number((performance.now() - startedAt).toFixed(0)),
            matched: result.matched,
            status: result.response?.status,
          });
          return result;
        } catch (error) {
          logger.error("rpc error", {
            method, path: pathname,
            ms: Number((performance.now() - startedAt).toFixed(0)),
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },
    ],
  });
