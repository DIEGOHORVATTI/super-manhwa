import { ORPCError } from "@orpc/server";
import { donationCreateSchema } from "@packages/contracts";
import { eq } from "drizzle-orm";
import { z } from "zod";

import * as schema from "@/lib/db/schema";
import { createPixPayment, mpEnabled } from "@/lib/payments/mercadopago";
import { base, pub } from "../base";

/**
 * Pix donations (Mercado Pago). `create` works for anonymous donors (userId
 * null); a signed-in donor is attributed. `status` is polled by the donation UI
 * until "approved". The server-to-server webhook stays a native route.
 */
export const donationsRouter = {
  create: pub.input(donationCreateSchema).handler(async ({ input, context }) => {
    if (!mpEnabled) {
      throw new ORPCError("SERVICE_UNAVAILABLE", { message: "Doações ainda não configuradas." });
    }

    const userId = context.session?.user?.id ?? null;
    const email = input.email ?? "doador@supermanhwa.app";
    const origin = new URL(context.headers.get("origin") ?? "http://localhost").origin;

    const pix = await createPixPayment({
      amount: input.amountCents / 100,
      description: "Doação | Super Manhwa",
      email,
      notificationUrl: `${origin}/api/donations/webhook`,
    });

    const { donations } = schema;
    const [row] = await context.db
      .insert(donations)
      .values({
        userId,
        amountCents: input.amountCents,
        provider: "mercadopago",
        providerPaymentId: pix.providerPaymentId,
        status: pix.status,
        pixQr: pix.qrCode,
        pixQrBase64: pix.qrCodeBase64,
        message: input.message ?? null,
      })
      .returning({ id: donations.id });

    return {
      id: row.id,
      status: pix.status,
      qrCode: pix.qrCode,
      qrCodeBase64: pix.qrCodeBase64,
    };
  }),

  status: base.input(z.object({ id: z.string() })).handler(async ({ input, context }) => {
    if (!context.db) return { status: "unconfigured" };
    const id = Number(input.id);
    if (!Number.isInteger(id)) throw new ORPCError("BAD_REQUEST");

    const { donations } = schema;
    const [row] = await context.db
      .select({ status: donations.status })
      .from(donations)
      .where(eq(donations.id, id))
      .limit(1);
    if (!row) throw new ORPCError("NOT_FOUND");
    return { status: row.status };
  }),
};
