import { proxyImage } from "@/container";

/**
 * Raw HTTP handler (not an oRPC route — binary stream). Dispatched from
 * `app.ts` when the path matches `/api/img/<token>`.
 */
export const imageProxyRoute = (token: string): Promise<Response> => proxyImage(token);
