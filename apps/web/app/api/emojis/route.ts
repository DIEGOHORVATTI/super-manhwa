import { CUSTOM_EMOJIS } from "@/lib/emojis";

export function GET() {
  return Response.json({ emojis: CUSTOM_EMOJIS });
}
