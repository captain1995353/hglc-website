"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { settlePayment } from "@/lib/payments/settle";

/** Throws the caller out unless they are an admin. */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) redirect("/dashboard");
  return user;
}

/** Confirms a manual bKash/Nagad/bank transfer and activates the enrolment. */
export async function approveManualPayment(formData: FormData) {
  const admin = await requireAdmin();
  const tranId = String(formData.get("tran_id") || "");
  if (!tranId) return;

  await settlePayment({
    tranId,
    providerRef: String(formData.get("provider_ref") || "") || null,
    meta: { source: "admin_review", verified_by: admin.id },
  });

  const client = createAdminClient();
  await client.from("payments").update({ verified_by: admin.id }).eq("tran_id", tranId);

  revalidatePath("/admin");
}

/** Rejects a manual transfer — the enrolment stays unpaid. */
export async function rejectManualPayment(formData: FormData) {
  const admin = await requireAdmin();
  const tranId = String(formData.get("tran_id") || "");
  const reason = String(formData.get("reason") || "not_found");
  if (!tranId) return;

  const client = createAdminClient();
  const { data: payment } = await client
    .from("payments")
    .select("id, status, meta")
    .eq("tran_id", tranId)
    .maybeSingle();

  if (!payment || payment.status === "paid") return;

  await client
    .from("payments")
    .update({
      status: "failed",
      verified_by: admin.id,
      verified_at: new Date().toISOString(),
      meta: { ...(payment.meta as object), rejected_reason: reason },
    })
    .eq("id", payment.id);

  revalidatePath("/admin");
}
