"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { initSslSession } from "@/lib/payments/sslcommerz";
import { newTranId } from "@/lib/payments/settle";
import { getStripe } from "@/lib/payments/stripe";
import { siteUrl } from "@/lib/site";

type Loaded = {
  userId: string;
  email: string;
  name: string;
  phone: string;
  enrollmentId: string;
  courseTitle: string;
  priceBdt: number;
  priceUsd: number;
};

/**
 * Loads the enrolment, confirming it belongs to the caller and still needs
 * paying. Everything price-related comes from the database, never the form —
 * the browser must not be able to choose what it owes.
 */
async function loadEnrollment(enrollmentId: string): Promise<Loaded> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/checkout/${enrollmentId}`);

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, user_id, status, course:courses (title_en, price_bdt, price_usd)")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (!enrollment || enrollment.user_id !== user.id) redirect("/dashboard");
  if (enrollment.status !== "pending_payment") redirect("/dashboard");

  const course = (
    Array.isArray(enrollment.course) ? enrollment.course[0] : enrollment.course
  ) as { title_en: string; price_bdt: number; price_usd: number } | undefined;

  if (!course) redirect("/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? "",
    name: profile?.full_name ?? "",
    phone: profile?.phone ?? "",
    enrollmentId: enrollment.id,
    courseTitle: course.title_en,
    priceBdt: Number(course.price_bdt),
    priceUsd: Number(course.price_usd),
  };
}

// ---------------------------------------------------------------------
// SSLCommerz — BDT (bKash, Nagad, Rocket, cards, net banking)
// ---------------------------------------------------------------------
export async function startSslPayment(formData: FormData) {
  const enrollmentId = String(formData.get("enrollment_id") || "");
  const info = await loadEnrollment(enrollmentId);

  const tranId = newTranId("HGLC");
  const admin = createAdminClient();

  const { error: insertError } = await admin.from("payments").insert({
    enrollment_id: info.enrollmentId,
    user_id: info.userId,
    provider: "sslcommerz",
    status: "initiated",
    amount: info.priceBdt,
    currency: "BDT",
    tran_id: tranId,
  });

  if (insertError) {
    console.error("startSslPayment insert:", insertError.message);
    redirect(`/checkout/${enrollmentId}?error=init`);
  }

  const base = `${siteUrl}/api/payments/sslcommerz`;
  const result = await initSslSession({
    tranId,
    amount: info.priceBdt,
    productName: info.courseTitle,
    customer: { name: info.name, email: info.email, phone: info.phone },
    successUrl: `${base}/callback?type=success`,
    failUrl: `${base}/callback?type=fail`,
    cancelUrl: `${base}/callback?type=cancel`,
    ipnUrl: `${base}/ipn`,
  });

  if (!result.ok) {
    await admin
      .from("payments")
      .update({ status: "failed", meta: { reason: result.reason } })
      .eq("tran_id", tranId);
    redirect(`/checkout/${enrollmentId}?error=${encodeURIComponent(result.reason)}`);
  }

  redirect(result.gatewayUrl);
}

// ---------------------------------------------------------------------
// Stripe — USD, for students paying from outside Bangladesh
// ---------------------------------------------------------------------
export async function startStripePayment(formData: FormData) {
  const enrollmentId = String(formData.get("enrollment_id") || "");
  const info = await loadEnrollment(enrollmentId);

  const tranId = newTranId("HGLCX");
  const admin = createAdminClient();

  await admin.from("payments").insert({
    enrollment_id: info.enrollmentId,
    user_id: info.userId,
    provider: "stripe",
    status: "initiated",
    amount: info.priceUsd,
    currency: "USD",
    tran_id: tranId,
  });

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: info.email || undefined,
    client_reference_id: tranId,
    metadata: { tran_id: tranId, enrollment_id: info.enrollmentId },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(info.priceUsd * 100),
          product_data: {
            name: info.courseTitle,
            description: "Hangeul Global Learning Center — course enrolment",
          },
        },
      },
    ],
    success_url: `${siteUrl}/checkout/${enrollmentId}/result?status=success&ref=${tranId}`,
    cancel_url: `${siteUrl}/checkout/${enrollmentId}/result?status=cancel&ref=${tranId}`,
  });

  if (!session.url) redirect(`/checkout/${enrollmentId}?error=stripe`);
  redirect(session.url);
}

// ---------------------------------------------------------------------
// Manual transfer — student sends bKash/Nagad money, admin confirms
// ---------------------------------------------------------------------
const RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];
const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;

const CHANNELS = ["bkash", "nagad", "bank", "cash"] as const;
type Channel = (typeof CHANNELS)[number];

/** Wallet transfers come from a phone; bank and cash payments do not. */
const NEEDS_SENDER: Record<Channel, boolean> = {
  bkash: true,
  nagad: true,
  bank: false,
  cash: false,
};

/** Cash handed over the desk has no reference to quote. */
const NEEDS_REFERENCE: Record<Channel, boolean> = {
  bkash: true,
  nagad: true,
  bank: true,
  cash: false,
};

export async function submitManualPayment(formData: FormData) {
  const enrollmentId = String(formData.get("enrollment_id") || "");
  const trxId = String(formData.get("trx_id") || "").trim().toUpperCase();
  const sender = String(formData.get("sender_number") || "").trim();
  const raw = String(formData.get("channel") || "bkash");
  const channel: Channel = (CHANNELS as readonly string[]).includes(raw)
    ? (raw as Channel)
    : "bkash";
  const receipt = formData.get("receipt");

  // Mirror of the form's own rules — the browser can be bypassed.
  if (NEEDS_REFERENCE[channel] && !trxId) {
    redirect(`/checkout/${enrollmentId}?error=missing`);
  }
  if (NEEDS_SENDER[channel] && !sender) {
    redirect(`/checkout/${enrollmentId}?error=missing`);
  }

  const info = await loadEnrollment(enrollmentId);
  const admin = createAdminClient();

  // What the student says they paid. It is a claim, not a fact — an admin
  // checks it against the statement before this becomes money. Bounded so a
  // typo or a tampered form cannot record an absurd figure.
  const claimed = Number(String(formData.get("amount") ?? "").trim());
  const amount =
    Number.isFinite(claimed) && claimed > 0
      ? Math.min(claimed, info.priceBdt * 10)
      : info.priceBdt;

  // Upload the proof of transfer first — if it fails there is no half-made
  // payment row to clean up.
  let receiptPath: string | null = null;

  if (receipt instanceof File && receipt.size > 0) {
    if (!RECEIPT_TYPES.includes(receipt.type)) {
      redirect(`/checkout/${enrollmentId}?error=receipt_type`);
    }
    if (receipt.size > RECEIPT_MAX_BYTES) {
      redirect(`/checkout/${enrollmentId}?error=receipt_size`);
    }

    const extension = receipt.name.split(".").pop()?.toLowerCase() || "jpg";
    // The first path segment is the owner — the storage policies key off it.
    const slug = trxId || channel.toUpperCase();
    const path = `${info.userId}/${slug}-${Date.now()}.${extension}`;

    const { error: uploadError } = await admin.storage
      .from("receipts")
      .upload(path, receipt, { contentType: receipt.type, upsert: false });

    if (uploadError) {
      console.error("receipt upload:", uploadError.message);
      redirect(`/checkout/${enrollmentId}?error=receipt_failed`);
    }

    receiptPath = path;
  }

  // A quoted reference doubles as our transaction id; cash has none, so it
  // gets a generated one that still has to be unique.
  const tranId = trxId ? `MAN-${trxId}` : `CASH-${newTranId("").replace(/^-/, "")}`;

  const { error } = await admin.from("payments").insert({
    enrollment_id: info.enrollmentId,
    user_id: info.userId,
    provider: "manual",
    status: "pending_review",
    amount,
    currency: "BDT",
    tran_id: tranId,
    provider_ref: trxId || null,
    sender_number: sender || null,
    receipt_path: receiptPath,
    meta: { channel },
  });

  if (error) {
    // Unique violation = this reference was already submitted by someone.
    const reason = error.code === "23505" ? "duplicate_trx" : "insert";
    redirect(`/checkout/${enrollmentId}?error=${reason}`);
  }

  revalidatePath(`/checkout/${enrollmentId}`);
  redirect(`/checkout/${enrollmentId}/result?status=pending`);
}
