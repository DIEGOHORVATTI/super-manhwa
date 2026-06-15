import { env } from "@/config/env";
import { proxyImage } from "@/container";
import type { FetchHandler } from "@/http/start-bun-server";

const TOKEN_PREFIX = "/api/img/";

/**
 * Raw HTTP handler (binary stream, not oRPC). Wired into the server via
 * `customHandlers` in `startBunServer`. Same X-API-KEY guard as the oRPC
 * routes | the same-origin Next proxy injects the header server-side, so the
 * browser never holds the key.
 */
export const imageRoute: FetchHandler = async (req) => {
  const url = new URL(req.url);
  if (!url.pathname.startsWith(TOKEN_PREFIX)) return null;

  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || apiKey !== env.API_KEY) {
    return Response.json({ error: "missing or invalid X-API-KEY" }, { status: 401 });
  }

  const token = url.pathname.slice(TOKEN_PREFIX.length);
  return proxyImage(token);
};
