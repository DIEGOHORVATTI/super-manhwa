import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";

async function guard() {
  const me = await getCurrentUser();
  return hasRole(me as { role?: string } | null, "staff") ? me : null;
}

/** Pixel blocks awaiting moderation (paid, status=pending). */
export async function GET() {
  if (!dbEnabled) return NextResponse.json({ blocks: [] });
  if (!(await guard())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getDb();
  const { pixelBlocks } = schema;
  const rows = await db.select().from(pixelBlocks).where(eq(pixelBlocks.status, "pending"));
  return NextResponse.json({
    blocks: rows.map((r) => ({
      id: r.id,
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
      linkUrl: r.linkUrl,
      title: r.title,
      imageUrl: r.imageR2Key ? publicUrlFor(r.imageR2Key) : null,
    })),
  });
}

const ModSchema = z.object({
  id: z.number().int().positive(),
  action: z.enum(["approve", "reject"]),
});

export async function POST(req: Request) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  if (!(await guard())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = ModSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = getDb();
  const { pixelBlocks } = schema;
  await db
    .update(pixelBlocks)
    .set(
      parsed.data.action === "approve"
        ? { status: "approved", approvedAt: new Date() }
        : { status: "rejected" },
    )
    .where(eq(pixelBlocks.id, parsed.data.id));
  return NextResponse.json({ ok: true });
}
