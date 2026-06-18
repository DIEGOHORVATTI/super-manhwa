import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { addEmoji } from "@/lib/emoji-manifest";
import { hasRole } from "@/lib/roles";

/**
 * POST /api/admin/emojis/import
 * Body: { emojis: { name: string; url: string }[] }
 * Downloads each image from the external URL and stores it in R2.
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

  const results: { name: string; url: string }[] = [];
  const errors: { name: string; error: string }[] = [];

  await Promise.all(
    emojis.map(async (e) => {
      const key = e.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "");
      if (!key) return;
      try {
        const res = await fetch(e.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentType = res.headers.get("content-type") ?? "image/png";
        const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
        const bytes = new Uint8Array(await res.arrayBuffer());
        const added = await addEmoji(key, bytes, contentType, ext);
        results.push(added);
      } catch (err) {
        errors.push({ name: key, error: String(err) });
      }
    }),
  );

  return NextResponse.json({ added: results.length, emojis: results, errors });
}
