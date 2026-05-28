import { ORPCError } from "@orpc/server";

/**
 * Tiny error helpers — mirror @repo/service-core's `notFound` / `badRequest` /
 * `conflict` from horvatti-champ. ORPCError is the public API; this file just
 * keeps the call sites readable.
 */
export const badRequest = (message: string) => new ORPCError("BAD_REQUEST", { message });
export const notFound = (message: string) => new ORPCError("NOT_FOUND", { message });
export const conflict = (message: string) => new ORPCError("CONFLICT", { message });
export const internal = (message: string) => new ORPCError("INTERNAL_SERVER_ERROR", { message });
