import "server-only";
import { MercadoPagoConfig, Payment } from "mercadopago";

/**
 * Mercado Pago Pix integration for donations. Gated on `MP_ACCESS_TOKEN` —
 * `mpEnabled` lets the donation routes 503 gracefully when unconfigured. We
 * create a Pix payment and return the copy-paste code + QR image so the UI can
 * render it; confirmation arrives asynchronously via the webhook.
 */
const accessToken = process.env.MP_ACCESS_TOKEN;
export const mpEnabled = Boolean(accessToken);

let payment: Payment | null = null;

function client(): Payment {
  if (!accessToken) throw new Error("MP_ACCESS_TOKEN is not set");
  if (!payment) payment = new Payment(new MercadoPagoConfig({ accessToken }));
  return payment;
}

export interface PixPayment {
  providerPaymentId: string;
  status: string;
  qrCode: string | null;
  qrCodeBase64: string | null;
}

/** Shape of the Mercado Pago Payment.create response we read from. */
export interface MpPaymentResponse {
  id?: string | number;
  status?: string;
  point_of_interaction?: {
    transaction_data?: { qr_code?: string; qr_code_base64?: string };
  };
}

/** Pure mapper from the MP response to our PixPayment — unit-testable. */
export function mapPixResponse(res: MpPaymentResponse): PixPayment {
  const tx = res.point_of_interaction?.transaction_data;
  return {
    providerPaymentId: String(res.id),
    status: res.status ?? "pending",
    qrCode: tx?.qr_code ?? null,
    qrCodeBase64: tx?.qr_code_base64 ?? null,
  };
}

export async function createPixPayment(opts: {
  amount: number; // BRL, decimal (e.g. 10.00)
  description: string;
  email: string;
  notificationUrl?: string;
}): Promise<PixPayment> {
  const res = await client().create({
    body: {
      transaction_amount: opts.amount,
      description: opts.description,
      payment_method_id: "pix",
      payer: { email: opts.email },
      notification_url: opts.notificationUrl,
    },
  });
  return mapPixResponse(res as MpPaymentResponse);
}

export async function getPaymentStatus(id: string): Promise<string> {
  const res = await client().get({ id });
  return res.status ?? "pending";
}
