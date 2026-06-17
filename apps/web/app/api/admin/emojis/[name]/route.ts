import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { removeEmoji } from "@/lib/emoji-manifest";
import { r2Enabled } from "@/lib/r2";
import { hasRole } from "@/lib/roles";

export async function DELETE(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!r2Enabled) return NextResponse.json({ error: "storage_unconfigured" }, { status: 503 });

  const session = await getServerSession();
  if (!hasRole(session?.user, "staff")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { name } = await params;
  await removeEmoji(name);
  return NextResponse.json({ ok: true });
}
