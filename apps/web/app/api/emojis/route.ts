import { listEmojisPublic } from "@/lib/emoji-manifest";

export const dynamic = "force-dynamic";

export async function GET() {
  const emojis = await listEmojisPublic();
  return Response.json({ emojis });
}
