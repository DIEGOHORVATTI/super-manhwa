import { listNeuralVoices } from "@/lib/tts/edge";

export async function GET() {
  const voices = await listNeuralVoices().catch(() => []);
  return Response.json(
    { voices },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } },
  );
}
