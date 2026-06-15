import path from "node:path";

import type { FetchHandler } from "@/http/start-bun-server";

/**
 * Serves the brand favicon for the OpenAPI docs page (`/api/docs`). The docs
 * `<head>` links `/api/favicon*`; these are static files copied into
 * `apps/backend/public`. Public (no API key) | they're just icons.
 */
const PUBLIC_DIR = path.join(import.meta.dir, "..", "..", "..", "..", "..", "public");

const ASSETS: Record<string, string> = {
  "/api/favicon.ico": "favicon.ico",
  "/api/favicon-32x32.png": "favicon-32x32.png",
  "/api/apple-icon-180x180.png": "apple-icon-180x180.png",
};

const CONTENT_TYPE: Record<string, string> = {
  ".ico": "image/x-icon",
  ".png": "image/png",
};

export const faviconRoute: FetchHandler = async (req) => {
  const { pathname } = new URL(req.url);
  const file = ASSETS[pathname];
  if (!file) return null;

  const f = Bun.file(path.join(PUBLIC_DIR, file));
  if (!(await f.exists())) return null;

  return new Response(f, {
    headers: {
      "content-type": CONTENT_TYPE[path.extname(file)] ?? "application/octet-stream",
      "cache-control": "public, max-age=86400",
    },
  });
};
