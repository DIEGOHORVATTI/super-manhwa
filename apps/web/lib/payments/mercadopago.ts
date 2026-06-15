import "server-only";
import { env } from "@/lib/env";
import { MercadoPagoConfig, Payment, PreApproval } from "mercadopago";

/**
 * Mercado Pago Pix integration for donations. Gated on `MP_ACCESS_TOKEN` |
 * `mpEnabled` lets the donation routes 503 gracefully when unconfigured. We
 * create a Pix payment and return the copy-paste code + QR image so the UI can
 * render it; confirmation arrives asynchronously via the webhook.
 */
const accessToken = env.MP_ACCESS_TOKEN;
export const mpEnabled = Boolean(accessToken);

/**
 * Public webhook URL for `path`, or `undefined` when we're not reachable from
 * the internet (localhost / non-https). Mercado Pago rejects a `notification_url`
 * that isn't a valid public URL, so in dev we just omit it (the payment is still
 * created; it simply won't get async webhook callbacks locally).
 */
export function publicWebhookUrl(path: string): string | undefined {
  const base = env.SITE_URL;
  if (!base || !/^https:\/\//i.test(base) || /localhost|127\.0\.0\.1/.test(base)) return undefined;
  return `${base.replace(/\/$/, "")}${path}`;
}

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

/** Pure mapper from the MP response to our PixPayment | unit-testable. */
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

/* ───────────────────────── Recurring subscription (preapproval) ───────────────────────── */

let preapproval: PreApproval | null = null;
function preapprovalClient(): PreApproval {
  if (!accessToken) throw new Error("MP_ACCESS_TOKEN is not set");
  if (!preapproval) preapproval = new PreApproval(new MercadoPagoConfig({ accessToken }));
  return preapproval;
}

export interface Subscription {
  id: string;
  status: string;
  initPoint: string | null; // checkout URL to send the user to
}

/** Create a monthly BRL premium subscription; returns the checkout init point. */
export async function createSubscription(opts: {
  email: string;
  amount: number; // BRL/month
  reason: string;
  backUrl: string;
}): Promise<Subscription> {
  const res = await preapprovalClient().create({
    body: {
      reason: opts.reason,
      payer_email: opts.email,
      back_url: opts.backUrl,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: opts.amount,
        currency_id: "BRL",
      },
      status: "pending",
    },
  });
  return {
    id: String(res.id),
    status: res.status ?? "pending",
    initPoint: res.init_point ?? null,
  };
}

export async function getSubscriptionStatus(id: string): Promise<string> {
  const res = await preapprovalClient().get({ id });
  return res.status ?? "pending";
}
