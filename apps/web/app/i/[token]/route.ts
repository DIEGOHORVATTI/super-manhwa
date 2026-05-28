import { decodeImage } from "@/lib/image";

/**
 * Image blob proxy. Decrypts the opaque token and streams the bytes through the
 * delivery backend's /img (which sets the Referer). The browser sees only this
 * same-origin URL and the bytes — never the real CDN URL nor the origin.
 */
const BACKEND = process.env.DELIVERY_SERVICE_URL ?? "http://localhost:8787";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }): Promise<Response> {
  const { token } = await ctx.params;
  const dec = decodeImage(token);
  if (!dec) return new Response("bad token", { status: 400 });

  const upstream = await fetch(
    `${BACKEND}/api/img?source=${encodeURIComponent(dec.s)}&url=${encodeURIComponent(dec.u)}`,
  );
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
      "cache-control": "public, max-age=86400",
    },
  });
}
