import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { dbEnabled, getDb, schema } from "@/lib/db";
import { GRID, MAX_BLOCKS_PER_SIDE, priceCents } from "@/lib/pixels";
import { publicUrlFor } from "@/lib/r2";

/**
 * Public board state: approved ads (with images/links) for rendering, plus every
 * currently-taken rectangle (approved + pending + non-expired reservations) so the
 * client can gate new selections. Also returns grid config + pricing.
 */
export async function GET() {
  if (!dbEnabled) {
    return NextResponse.json({
      ads: [],
      taken: [],
      grid: GRID,
      blockPriceCents: priceCents({ x: 0, y: 0, w: 1, h: 1 }),
      maxSide: MAX_BLOCKS_PER_SIDE,
    });
  }
  const db = getDb();
  const { pixelBlocks } = schema;
  const rows = await db
    .select()
    .from(pixelBlocks)
    .where(inArray(pixelBlocks.status, ["approved", "pending", "reserved"]));

  const now = Date.now();
  const active = rows.filter(
    (r) =>
      r.status === "approved" ||
      r.status === "pending" ||
      (r.status === "reserved" && r.reservedUntil != null && r.reservedUntil.getTime() > now),
  );

  const ads = active
    .filter((r) => r.status === "approved" && r.imageR2Key)
    .map((r) => ({
      id: r.id,
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
      imageUrl: publicUrlFor(r.imageR2Key!),
      linkUrl: r.linkUrl,
      title: r.title,
    }));

  const taken = active.map((r) => ({ x: r.x, y: r.y, w: r.w, h: r.h }));

  return NextResponse.json({
    ads,
    taken,
    grid: GRID,
    blockPriceCents: priceCents({ x: 0, y: 0, w: 1, h: 1 }),
    maxSide: MAX_BLOCKS_PER_SIDE,
  });
}
