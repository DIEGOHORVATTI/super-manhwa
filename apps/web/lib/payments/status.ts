/**
 * Maps Mercado Pago payment statuses to our internal donation status. Pure, so
 * the webhook's status logic is unit-testable. MP statuses:
 *   approved                          → approved
 *   rejected | cancelled              → rejected
 *   pending | in_process | authorized → pending
 */
export type DonationStatus = "approved" | "rejected" | "pending";

export function normalizeMpStatus(status: string | null | undefined): DonationStatus {
  if (status === "approved") return "approved";
  if (status === "rejected" || status === "cancelled") return "rejected";
  return "pending";
}
