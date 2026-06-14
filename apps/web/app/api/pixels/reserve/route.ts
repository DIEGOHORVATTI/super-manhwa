import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { createPixPayment, mpEnabled } from "@/lib/payments/mercadopago";
import { isFree, isValidRect, priceCents, type Rect } from "@/lib/pixels";
import { putObject, r2Enabled } from "@/lib/r2";

/**
 * Reserve a rectangle of blocks and start its Pix payment. Multipart body:
 * x,y,w,h (block coords), linkUrl, title, image (file). Uploads the banner to R2,
 * creates a 20-minute reservation + Pix charge; the webhook flips it to "pending"
 * on payment, then an admin approves it onto the public board.
 */
const RESERVE_MIN = 20 * 60 * 1000;
const MAX_IMG = 4 * 1024 * 1024;

export async function POST(req: Request) {
  if (!dbEnabled || !mpEnabled)
    return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  if (!r2Enabled) return NextResponse.json({ error: "storage_unconfigured" }, { status: 503 });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const rect: Rect = {
    x: Number(form.get("x")),
    y: Number(form.get("y")),
    w: Number(form.get("w")),
    h: Number(form.get("h")),
  };
  const linkUrl = String(form.get("linkUrl") ?? "").trim();
  const title = String(form.get("title") ?? "").trim() || null;
  const image = form.get("image");

  if (!isValidRect(rect)) return NextResponse.json({ error: "bad_rect" }, { status: 400 });
  if (!/^https?:\/\/.+/i.test(linkUrl))
    return NextResponse.json({ error: "bad_link" }, { status: 400 });
  if (!(image instanceof File) || image.size === 0 || image.size > MAX_IMG) {
    return NextResponse.json({ error: "bad_image" }, { status: 400 });
  }

  const db = getDb();
  const { pixelBlocks } = schema;

  // Collision check against active rectangles.
  const rows = await db
    .select({
      x: pixelBlocks.x,
      y: pixelBlocks.y,
      w: pixelBlocks.w,
      h: pixelBlocks.h,
      status: pixelBlocks.status,
      reservedUntil: pixelBlocks.reservedUntil,
    })
    .from(pixelBlocks)
    .where(inArray(pixelBlocks.status, ["approved", "pending", "reserved"]));
  const now = Date.now();
  const taken = rows
    .filter(
      (r) =>
        r.status !== "reserved" || (r.reservedUntil != null && r.reservedUntil.getTime() > now),
    )
    .map((r) => ({ x: r.x, y: r.y, w: r.w, h: r.h }));
  if (!isFree(rect, taken)) return NextResponse.json({ error: "taken" }, { status: 409 });

  // Create the row first to get an id for the R2 key.
  const reservedUntil = new Date(now + RESERVE_MIN);
  const [block] = await db
    .insert(pixelBlocks)
    .values({
      ownerUserId: session.user.id,
      ...rect,
      linkUrl,
      title,
      status: "reserved",
      reservedUntil,
    })
    .returning({ id: pixelBlocks.id });

  const ext = (image.type.split("/")[1] ?? "png").replace("jpeg", "jpg");
  const key = `pixels/${block.id}.${ext}`;
  await putObject(key, new Uint8Array(await image.arrayBuffer()), image.type || "image/png");

  const origin = new URL(req.url).origin;
  const pix = await createPixPayment({
    amount: priceCents(rect) / 100,
    description: `Espaço publicitário ${rect.w}x${rect.h} — Super Manhwa`,
    email: session.user.email,
    notificationUrl: `${origin}/api/pixels/webhook`,
  });

  await db
    .update(pixelBlocks)
    .set({ imageR2Key: key, paymentId: pix.providerPaymentId })
    .where(inArray(pixelBlocks.id, [block.id]));

  return NextResponse.json({
    id: block.id,
    qrCode: pix.qrCode,
    qrCodeBase64: pix.qrCodeBase64,
    amountCents: priceCents(rect),
  });
}
