import { NextResponse, type NextRequest } from "next/server";
import { isSslPaid, validateSslTransaction } from "@/lib/payments/sslcommerz";
import { markPaymentStatus, settlePayment } from "@/lib/payments/settle";

/**
 * Server-to-server notification from SSLCommerz. This is the authoritative
 * path — it arrives even if the student closes the browser mid-redirect.
 * `settlePayment` is idempotent, so the redirect handler running first is fine.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const tranId = String(form.get("tran_id") || "");
  const valId = String(form.get("val_id") || "");
  const status = String(form.get("status") || "");

  if (!tranId) return NextResponse.json({ ok: false }, { status: 400 });

  if (status === "FAILED" || status === "CANCELLED") {
    await markPaymentStatus(
      tranId,
      status === "FAILED" ? "failed" : "cancelled",
      { source: "ipn" },
    );
    return NextResponse.json({ ok: true });
  }

  const validation = valId ? await validateSslTransaction(valId) : null;

  if (!isSslPaid(validation) || validation?.tran_id !== tranId) {
    await markPaymentStatus(tranId, "failed", {
      source: "ipn",
      validation_status: validation?.status ?? "no_response",
    });
    return NextResponse.json({ ok: true });
  }

  await settlePayment({
    tranId,
    providerRef: valId,
    paidAmount: Number(validation?.amount ?? 0),
    meta: {
      source: "ipn",
      bank_tran_id: validation?.bank_tran_id,
      card_type: validation?.card_type,
    },
  });

  return NextResponse.json({ ok: true });
}
