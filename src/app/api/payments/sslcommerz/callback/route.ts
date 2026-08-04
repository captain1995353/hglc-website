import { NextResponse, type NextRequest } from "next/server";
import {
  isSslPaid,
  validateSslTransaction,
} from "@/lib/payments/sslcommerz";
import { markPaymentStatus, settlePayment } from "@/lib/payments/settle";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * SSLCommerz redirects the student's browser here with a form POST after
 * success / failure / cancellation. We re-validate server-to-server before
 * believing anything, then bounce the browser to a readable result page.
 */
export async function POST(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") ?? "success";
  const origin = request.nextUrl.origin;

  const form = await request.formData();
  const tranId = String(form.get("tran_id") || "");
  const valId = String(form.get("val_id") || "");

  if (!tranId) {
    return NextResponse.redirect(`${origin}/dashboard?error=no_tran_id`, 303);
  }

  const enrollmentId = await enrollmentFor(tranId);
  const resultBase = enrollmentId
    ? `${origin}/checkout/${enrollmentId}/result`
    : `${origin}/dashboard`;

  if (type === "cancel") {
    await markPaymentStatus(tranId, "cancelled", { source: "redirect" });
    return NextResponse.redirect(`${resultBase}?status=cancel&ref=${tranId}`, 303);
  }

  if (type === "fail") {
    await markPaymentStatus(tranId, "failed", {
      source: "redirect",
      gateway_error: String(form.get("error") || ""),
    });
    return NextResponse.redirect(`${resultBase}?status=fail&ref=${tranId}`, 303);
  }

  const validation = valId ? await validateSslTransaction(valId) : null;

  if (!isSslPaid(validation) || validation?.tran_id !== tranId) {
    await markPaymentStatus(tranId, "failed", {
      source: "redirect",
      validation_status: validation?.status ?? "no_response",
    });
    return NextResponse.redirect(`${resultBase}?status=fail&ref=${tranId}`, 303);
  }

  const settled = await settlePayment({
    tranId,
    providerRef: valId,
    paidAmount: Number(validation?.amount ?? 0),
    meta: {
      source: "redirect",
      bank_tran_id: validation?.bank_tran_id,
      card_type: validation?.card_type,
      risk_level: validation?.risk_level,
    },
  });

  const status = settled.ok ? "success" : "fail";
  const target = settled.enrollmentId
    ? `${origin}/checkout/${settled.enrollmentId}/result`
    : resultBase;

  return NextResponse.redirect(`${target}?status=${status}&ref=${tranId}`, 303);
}

/** SSLCommerz occasionally GETs the cancel URL — handle it gracefully. */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const tranId = request.nextUrl.searchParams.get("tran_id") || "";
  if (tranId) await markPaymentStatus(tranId, "cancelled", { source: "redirect_get" });
  return NextResponse.redirect(`${origin}/dashboard`, 303);
}

async function enrollmentFor(tranId: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("payments")
      .select("enrollment_id")
      .eq("tran_id", tranId)
      .maybeSingle();
    return data?.enrollment_id ?? null;
  } catch {
    return null;
  }
}
