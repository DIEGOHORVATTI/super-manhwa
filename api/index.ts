/**
 * Vercel /api/* function (ADR-0008). All /api/* requests are rewritten here via
 * vercel.json with the real path captured in `__p` (the Vite preset doesn't honor
 * catch-all API routes, so we reconstruct the path). Dual-mode:
 *  - DELIVERY_SERVICE_URL set → reverse-proxy to the Docker delivery service.
 *  - else → run the handler in-process (fallback so prod works without the container).
 */
import type { IncomingMessage, ServerResponse } from "node:http";

export const config = { maxDuration: 60 };

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const host = req.headers.host ?? "localhost";
  const incoming = new URL(req.url ?? "/", `https://${host}`);

  // Rebuild the original /api/* path from the rewrite capture.
  const p = incoming.searchParams.get("__p") ?? "";
  incoming.searchParams.delete("__p");
  const qs = incoming.searchParams.toString();
  const realPath = "/api/" + p + (qs ? "?" + qs : "");

  const delivery = process.env.DELIVERY_SERVICE_URL;
  let response: Response;
  if (delivery) {
    response = await fetch(delivery.replace(/\/$/, "") + realPath, {
      method: req.method ?? "GET",
      headers: { "user-agent": "vercel-proxy" },
    });
  } else {
    const { handle } = await import("../apps/backend/src/app.js");
    response = await handle(new Request(`https://${host}${realPath}`, { method: req.method ?? "GET" }));
  }

  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "content-encoding") res.setHeader(key, value);
  });
  res.end(Buffer.from(await response.arrayBuffer()));
}
