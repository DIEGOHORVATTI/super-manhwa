import { describe, expect, it } from "bun:test";

import { mapPixResponse } from "../lib/payments/mercadopago";

describe("mapPixResponse", () => {
  it("extracts id, status and the Pix transaction data", () => {
    const res = mapPixResponse({
      id: 12345,
      status: "pending",
      point_of_interaction: {
        transaction_data: { qr_code: "PIX-COPY-PASTE", qr_code_base64: "AAAA" },
      },
    });
    expect(res).toEqual({
      providerPaymentId: "12345",
      status: "pending",
      qrCode: "PIX-COPY-PASTE",
      qrCodeBase64: "AAAA",
    });
  });

  it("defaults status to pending and qr fields to null when absent", () => {
    const res = mapPixResponse({ id: 7 });
    expect(res.providerPaymentId).toBe("7");
    expect(res.status).toBe("pending");
    expect(res.qrCode).toBeNull();
    expect(res.qrCodeBase64).toBeNull();
  });

  it("stringifies a numeric id", () => {
    expect(mapPixResponse({ id: 99 }).providerPaymentId).toBe("99");
  });
});
