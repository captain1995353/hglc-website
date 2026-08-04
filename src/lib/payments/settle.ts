import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentStatus } from "@/lib/types";

/**
 * Marks a payment paid and activates its enrolment.
 *
 * Runs with the service-role key because students have no UPDATE policy on
 * payments — only gateway callbacks and admin review may move money to 'paid'.
 * Idempotent: a second call for an already-paid tran_id is a no-op, which
 * matters because SSLCommerz sends both a browser redirect and an IPN.
 */
export async function settlePayment(opts: {
  tranId: string;
  providerRef?: string | null;
  /** Amount the gateway says it captured — checked against our record. */
  paidAmount?: number | null;
  meta?: Record<string, unknown>;
}): Promise<{ ok: boolean; enrollmentId?: string; reason?: string }> {
  const admin = createAdminClient();

  const { data: payment, error } = await admin
    .from("payments")
    .select("id, enrollment_id, amount, status, meta")
    .eq("tran_id", opts.tranId)
    .maybeSingle();

  if (error || !payment) return { ok: false, reason: "unknown_transaction" };
  if (payment.status === "paid") {
    return { ok: true, enrollmentId: payment.enrollment_id };
  }

  // Guard against a tampered redirect that under-pays.
  if (
    typeof opts.paidAmount === "number" &&
    Number(opts.paidAmount) + 0.01 < Number(payment.amount)
  ) {
    await admin
      .from("payments")
      .update({
        status: "failed" satisfies PaymentStatus,
        meta: { ...(payment.meta as object), reason: "amount_mismatch", ...opts.meta },
      })
      .eq("id", payment.id);
    return { ok: false, reason: "amount_mismatch" };
  }

  await admin
    .from("payments")
    .update({
      status: "paid" satisfies PaymentStatus,
      provider_ref: opts.providerRef ?? null,
      verified_at: new Date().toISOString(),
      meta: { ...(payment.meta as object), ...opts.meta },
    })
    .eq("id", payment.id);

  await admin
    .from("enrollments")
    .update({ status: "active" })
    .eq("id", payment.enrollment_id);

  return { ok: true, enrollmentId: payment.enrollment_id };
}

/** Records a terminal non-payment (gateway failure or user cancellation). */
export async function markPaymentStatus(
  tranId: string,
  status: Extract<PaymentStatus, "failed" | "cancelled">,
  meta?: Record<string, unknown>,
) {
  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .select("id, status, meta")
    .eq("tran_id", tranId)
    .maybeSingle();

  // Never downgrade a payment that already went through.
  if (!payment || payment.status === "paid") return;

  await admin
    .from("payments")
    .update({ status, meta: { ...(payment.meta as object), ...meta } })
    .eq("id", payment.id);
}

/** `tran_id` we send to gateways: short, unique, traceable back to us. */
export function newTranId(prefix = "HGLC") {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${stamp}-${random}`;
}
