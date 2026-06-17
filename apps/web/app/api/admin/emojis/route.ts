import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { addEmoji, listEmojisPublic } from "@/lib/emoji-manifest";
import { r2Enabled } from "@/lib/r2";
import { hasRole } from "@/lib/roles";

const MAX = 1 * 1024 * 1024; // 1 MB per emoji image

function guard() {
  if (!r2Enabled) return NextResponse.json({ error: "storage_unconfigured" }, { status: 503 });
  return null;
}

export async function GET() {
  const session = await getServerSession();
  if (!hasRole(session?.user, "staff")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const emojis = await listEmojisPublic();
  return NextResponse.json({ emojis });
}

export async function POST(req: Request) {
  const err = guard();
  if (err) return err;

  const session = await getServerSession();
  if (!hasRole(session?.user, "staff")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const name = String(form.get("name") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  const file = form.get("image");

  if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });
  if (!(file instanceof File) || file.size === 0 || file.size > MAX) {
    return NextResponse.json({ error: "bad_image" }, { status: 400 });
  }

  const ext = (file.type.split("/")[1] ?? "png").replace("jpeg", "jpg");
  const emoji = await addEmoji(name, new Uint8Array(await file.arrayBuffer()), file.type, ext);
  return NextResponse.json({ emoji });
}
