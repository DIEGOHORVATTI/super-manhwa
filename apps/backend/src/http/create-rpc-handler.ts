import type { HTTPPath } from "@orpc/client";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import type { AnyRouter } from "@orpc/server";
import { CORSPlugin, RequestHeadersPlugin, ResponseHeadersPlugin } from "@orpc/server/plugins";
import { ZodSmartCoercionPlugin } from "@orpc/zod";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";

import { logger } from "@/shared/logger";

const clip = (s: string, max = 160) => (s.length > max ? `${s.slice(0, max)}…` : s);

/** Route input for the log: the decoded query string, or the body for mutations. */
const reqInput = async (req: {
  url: URL;
  body: () => Promise<unknown>;
}): Promise<string | undefined> => {
  const { search } = req.url;
  if (search) {
    try {
      return clip(decodeURIComponent(search));
    } catch {
      return clip(search);
    }
  }
  try {
    const body = await req.body();
    return body == null ? undefined : clip(typeof body === "string" ? body : JSON.stringify(body));
  } catch {
    return undefined;
  }
};

/**
 * Minimal OpenAPI info shape | keeps us off the `openapi-types` dependency
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
 * Builds the `OpenAPIHandler` with every plugin we want everywhere | CORS, body
 * coercion, headers, optional docs | and a single interceptor that logs each
 * request with timing. Lifted from `novo-horizonte/server/src/http/create-rpc-randler.ts`
 * (typo "randler" → "handler" intentionally fixed).
 */
export const createRpcHandler = ({
  router,
  allowedOrigins,
  info,
  docsPath = "/docs",
  exposeDocs = true,
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
      ...(exposeDocs
        ? [
            new OpenAPIReferencePlugin({
              docsProvider: "scalar",
              docsPath,
              docsTitle: `${info.title} | Docs`,
              // Brand the docs tab with our favicon (served by the backend at
              // /api/favicon.ico via the customHandler in index.ts).
              docsHead: `<link rel="icon" type="image/png" sizes="32x32" href="/api/favicon-32x32.png" /><link rel="icon" href="/api/favicon.ico" sizes="any" />`,
              schemaConverters: [new ZodToJsonSchemaConverter()],
              specGenerateOptions: { servers: [{ url: "/" }], info },
            }),
          ]
        : []),
    ],
    interceptors: [
      // Single access-log site: route + payload in, status + response out. Raw
      // `/api/img` streams bypass dispatch, so they never reach here (by design).
      async ({ request, next }) => {
        const { pathname } = request.url;
        const method = request.method;
        const startedAt = performance.now();
        try {
          const result = await next();
          const ms = Number((performance.now() - startedAt).toFixed(0));
          // The response body is already a parsed value | no clone/parse needed.
          void reqInput(request).then((input) =>
            logger.http({
              method,
              path: pathname,
              input,
              output: result.response?.body,
              ms,
              status: result.response?.status,
              matched: result.matched,
            }),
          );
          return result;
        } catch (error) {
          logger.http({
            method,
            path: pathname,
            ms: Number((performance.now() - startedAt).toFixed(0)),
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },
    ],
  });
