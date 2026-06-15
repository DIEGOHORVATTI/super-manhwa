import { ORPCError } from "@orpc/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import * as schema from "@/lib/db/schema";
import { createPixPayment, mpEnabled } from "@/lib/payments/mercadopago";
import { GRID, isFree, isValidRect, priceCents, type Rect } from "@/lib/pixels";
import { publicUrlFor, putObject, r2Enabled } from "@/lib/r2";
import { authed, base } from "../base";

/**
 * The self-serve "million pixel" ad board. `grid` is a public read (degrades to
 * empty without a DB) returning approved ads + every taken rectangle for client
 * collision gating. `reserve` locks a rectangle, uploads its banner to R2 and
 * opens a Pix charge; the server-to-server webhook stays a native route. Block
 * geometry/pricing reuse the pure `lib/pixels` helpers.
 */
const RESERVE_MIN = 20 * 60 * 1000;
const MAX_IMG = 4 * 1024 * 1024;

const reserveSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  linkUrl: z.string(),
  title: z.string().nullable().optional(),
  image: z.instanceof(File),
});

export const pixelsRouter = {
  grid: base.handler(async ({ context }) => {
    const blockPriceCents = priceCents({ x: 0, y: 0, w: 1, h: 1 });
    if (!context.db) {
      return { ads: [], taken: [], grid: GRID, blockPriceCents };
    }

    const { pixelBlocks } = schema;
    const rows = await context.db
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

    return { ads, taken, grid: GRID, blockPriceCents };
  }),

  reserve: authed.input(reserveSchema).handler(async ({ input, context }) => {
    if (!mpEnabled) {
      throw new ORPCError("SERVICE_UNAVAILABLE", { message: "Pagamentos indisponíveis." });
    }
    if (!r2Enabled) {
      throw new ORPCError("SERVICE_UNAVAILABLE", { message: "Armazenamento indisponível." });
    }

    const rect: Rect = { x: input.x, y: input.y, w: input.w, h: input.h };
    const linkUrl = input.linkUrl.trim();
    const title = (input.title ?? "").trim() || null;
    const image = input.image;

    if (!isValidRect(rect)) throw new ORPCError("BAD_REQUEST", { message: "bad_rect" });
    if (!/^https?:\/\/.+/i.test(linkUrl)) {
      throw new ORPCError("BAD_REQUEST", { message: "bad_link" });
    }
    if (image.size === 0 || image.size > MAX_IMG) {
      throw new ORPCError("BAD_REQUEST", { message: "bad_image" });
    }

    const { pixelBlocks } = schema;

    // Collision check against active rectangles.
    const rows = await context.db
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
    if (!isFree(rect, taken)) throw new ORPCError("CONFLICT", { message: "taken" });

    // Create the row first to get an id for the R2 key.
    const reservedUntil = new Date(now + RESERVE_MIN);
    const [block] = await context.db
      .insert(pixelBlocks)
      .values({
        ownerUserId: context.user.id,
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

    const origin = new URL(context.headers.get("origin") ?? "http://localhost").origin;
    const email = (context.user as { email?: string }).email ?? "anunciante@supermanhwa.app";
    const pix = await createPixPayment({
      amount: priceCents(rect) / 100,
      description: `Espaço publicitário ${rect.w}x${rect.h} — Super Manhwa`,
      email,
      notificationUrl: `${origin}/api/pixels/webhook`,
    });

    await context.db
      .update(pixelBlocks)
      .set({ imageR2Key: key, paymentId: pix.providerPaymentId })
      .where(eq(pixelBlocks.id, block.id));

    return {
      id: block.id,
      qrCode: pix.qrCode,
      qrCodeBase64: pix.qrCodeBase64,
      amountCents: priceCents(rect),
    };
  }),

  status: base.input(z.object({ id: z.string() })).handler(async ({ input, context }) => {
    if (!context.db) return { status: "unconfigured" };
    const id = Number(input.id);
    if (!Number.isInteger(id)) throw new ORPCError("BAD_REQUEST");

    const { pixelBlocks } = schema;
    const [row] = await context.db
      .select({ status: pixelBlocks.status })
      .from(pixelBlocks)
      .where(eq(pixelBlocks.id, id))
      .limit(1);
    if (!row) throw new ORPCError("NOT_FOUND");
    return { status: row.status };
  }),
};
