import { handleLegalSubmission, rateLimited } from "@/lib/legal";
import { dmcaInputSchema } from "@/lib/schemas/legal";

export async function POST(req: Request): Promise<Response> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) return Response.json({ ok: false, reason: "rate" }, { status: 429 });

  const parsed = dmcaInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.hp) {
    return Response.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  try {
    const res = await handleLegalSubmission("dmca", parsed.data);
    if (!res.ok) return Response.json({ ok: false, reason: "unconfigured" }, { status: 503 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, reason: "error" }, { status: 500 });
  }
}
