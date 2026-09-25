import { VOICE_ID } from "@/lib/tts/edge-protocol";
import { synthesize } from "@/lib/tts/edge";

export const runtime = "nodejs";

const MAX_TEXT = 400;
const PERCENT_LIMIT = 50;

function percent(value: string | null) {
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, -PERCENT_LIMIT), PERCENT_LIMIT) : 0;
}

/**
 * Neural narration for one chunk of text. Deterministic for (voice, pitch, rate,
 * text), so the CDN caches it for a year and the same sentence is synthesized once.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const voice = params.get("v") ?? "";
  const text = (params.get("t") ?? "").trim();

  if (!VOICE_ID.test(voice) || !text || text.length > MAX_TEXT) {
    return Response.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  try {
    const audio = await synthesize({
      text,
      voice,
      pitchPercent: percent(params.get("p")),
      ratePercent: percent(params.get("r")),
    });
    return new Response(new Uint8Array(audio), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha na síntese" },
      { status: 502 },
    );
  }
}
