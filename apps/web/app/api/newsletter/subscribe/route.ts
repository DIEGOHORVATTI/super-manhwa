import { newsletterEnabled, subscribeEmail } from "@/lib/newsletter";
import { subscribeInputSchema } from "@/lib/schemas/newsletter";

export async function POST(req: Request): Promise<Response> {
  if (!newsletterEnabled()) {
    return Response.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  }

  const parsed = subscribeInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.hp) {
    return Response.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const result = await subscribeEmail(parsed.data.email, process.env.SITE_URL ?? origin);
  if (result === "error") return Response.json({ ok: false, reason: "send" }, { status: 502 });
  return Response.json({ ok: true, status: result });
}
