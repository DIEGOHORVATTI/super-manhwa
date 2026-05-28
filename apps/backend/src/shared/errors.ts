import { ORPCError } from "@orpc/server";

/**
 * Throw-style HTTP error helpers. Return type `never` lets callers write
 *
 *     if (!user) throw notFound("user not found");
 *
 * and TypeScript narrows correctly on the next line. Mirrored from
 * `novo-horizonte/server/src/shared/errors.ts`.
 */

export type HttpOrpcErrorCode =
  | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST"
  | "CONFLICT" | "INTERNAL_SERVER_ERROR";

export type HttpOrpcErrorData = { details?: string };
export type HttpOrpcError = ORPCError<HttpOrpcErrorCode, HttpOrpcErrorData | undefined>;

const make = (
  code: HttpOrpcErrorCode,
  message: string,
  details?: string,
): HttpOrpcError =>
  new ORPCError(code, {
    message,
    data: details ? { details } : undefined,
  });

export const unauthorized = (message: string, details?: string): never => {
  throw make("UNAUTHORIZED", message, details);
};
export const forbidden = (message: string, details?: string): never => {
  throw make("FORBIDDEN", message, details);
};
export const notFound = (message: string, details?: string): never => {
  throw make("NOT_FOUND", message, details);
};
export const badRequest = (message: string, details?: string): never => {
  throw make("BAD_REQUEST", message, details);
};
export const conflict = (message: string, details?: string): never => {
  throw make("CONFLICT", message, details);
};
export const internalError = (message: string, details?: string): never => {
  throw make("INTERNAL_SERVER_ERROR", message, details);
};
