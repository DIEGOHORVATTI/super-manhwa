/**
 * Delivery service entrypoint (ADR-0008). Persistent Bun HTTP server running the
 * oRPC-backed handler. Runs locally (`bun dev`) and in the Docker container.
 */
import { handle } from "@/app";

const port = Number(process.env.PORT ?? 8787);

const server = Bun.serve({
  port,
  idleTimeout: 120,
  fetch: (req) => {
    const url = new URL(req.url);
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
    }
    return handle(req);
  },
});

console.log(`[delivery] listening on http://localhost:${server.port}`);
