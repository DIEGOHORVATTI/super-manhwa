import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { addEmojiUrls } from "@/lib/emoji-manifest";
import { hasRole } from "@/lib/roles";

/**
 * POST /api/admin/emojis/import
 * Body: { emojis: { name: string; url: string }[] }
 * Bulk-imports emojis by external URL without downloading — the URL is stored
 * directly in the manifest so the image is served from its origin (e.g. atsu.moe CDN).
 */
export async function POST(req: Request) {
  const session = await getServerSession();
  if (!hasRole(session?.user, "staff")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as unknown;
  if (!body || typeof body !== "object" || !Array.isArray((body as { emojis?: unknown }).emojis)) {
    return NextResponse.json({ error: "expected { emojis: [{name, url}] }" }, { status: 400 });
  }

  const raw = (body as { emojis: unknown[] }).emojis;
  const emojis = raw.filter(
    (e): e is { name: string; url: string } =>
      typeof e === "object" &&
      e !== null &&
      typeof (e as { name?: unknown }).name === "string" &&
      typeof (e as { url?: unknown }).url === "string",
  );

  const added = await addEmojiUrls(emojis);
  return NextResponse.json({ added: added.length, emojis: added });
}
