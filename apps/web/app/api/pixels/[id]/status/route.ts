import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { dbEnabled, getDb, schema } from "@/lib/db";

/** Poll a pixel block's status (the buy UI watches for payment → pending). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!dbEnabled) return NextResponse.json({ status: "unconfigured" });
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = getDb();
  const { pixelBlocks } = schema;
  const [row] = await db
    .select({ status: pixelBlocks.status })
    .from(pixelBlocks)
    .where(eq(pixelBlocks.id, id))
    .limit(1);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ status: row.status });
}
