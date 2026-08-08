import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings, setting } from "@/lib/settings";
import { site } from "@/lib/site";

export type InvoiceData = {
  paymentId: string;
  invoiceNo: string;
  status: string;
  paid: boolean;
  amount: number;
  currency: string;
  method: string;
  reference: string | null;
  issuedAt: string;
  student: { name: string; email: string; phone: string };
  course: { title: string; level: string };
  batch: { name: string; schedule: string } | null;
  centre: { name: string; address: string; phone: string; email: string };
};

function methodLabel(provider: string, channel: string) {
  if (provider === "sslcommerz") return "Card / mobile wallet (SSLCommerz)";
  if (provider === "stripe") return "Card (Stripe)";
  if (channel === "cash") return "Cash at the centre";
  if (channel === "bank") return "Bank transfer";
  if (channel) return channel.charAt(0).toUpperCase() + channel.slice(1);
  return "Manual transfer";
}

/**
 * Everything an invoice needs, in one shape shared by the web page and the
 * PDF, so the two can never drift apart.
 *
 * Returns null when the payment does not exist or the viewer is not entitled
 * to it — the caller turns that into a 404 rather than leaking which.
 */
export async function loadInvoice(
  paymentId: string,
  viewerId: string,
): Promise<InvoiceData | null> {
  const db = createAdminClient();

  const { data: payment } = await db
    .from("payments")
    .select(
      "id, invoice_no, amount, currency, status, provider, provider_ref, verified_at, created_at, user_id, meta, enrollment:enrollments (course:courses (title_en, level), batch:batches (name, schedule_text))",
    )
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) return null;

  const { data: viewer } = await db
    .from("profiles")
    .select("role")
    .eq("id", viewerId)
    .maybeSingle();

  const isStaff = viewer?.role === "admin" || viewer?.role === "staff";
  if (payment.user_id !== viewerId && !isStaff) return null;

  const [{ data: billed }, { data: account }, settings] = await Promise.all([
    db.from("profiles").select("full_name, phone").eq("id", payment.user_id).maybeSingle(),
    db.auth.admin.getUserById(payment.user_id),
    getSettings(),
  ]);

  const enrollment = (
    Array.isArray(payment.enrollment) ? payment.enrollment[0] : payment.enrollment
  ) as {
    course:
      | { title_en: string; level: string }
      | { title_en: string; level: string }[];
    batch:
      | { name: string; schedule_text: string }
      | { name: string; schedule_text: string }[]
      | null;
  } | null;

  const course = enrollment
    ? ((Array.isArray(enrollment.course)
        ? enrollment.course[0]
        : enrollment.course) as { title_en: string; level: string } | null)
    : null;
  const batch = enrollment
    ? ((Array.isArray(enrollment.batch)
        ? enrollment.batch[0]
        : enrollment.batch) as { name: string; schedule_text: string } | null)
    : null;

  const channel = String((payment.meta as Record<string, unknown>)?.channel ?? "");

  return {
    paymentId: payment.id,
    invoiceNo: payment.invoice_no ?? "—",
    status: payment.status,
    paid: payment.status === "paid",
    amount: Number(payment.amount),
    currency: payment.currency,
    method: methodLabel(payment.provider, channel),
    reference: payment.provider_ref,
    issuedAt: payment.verified_at ?? payment.created_at,
    student: {
      name: billed?.full_name ?? "Student",
      email: account?.user?.email ?? "",
      phone: billed?.phone ?? "",
    },
    course: {
      title: course?.title_en ?? "Course enrolment",
      level: course?.level ?? "",
    },
    batch: batch ? { name: batch.name, schedule: batch.schedule_text } : null,
    centre: {
      name: site.name,
      address: setting(settings, "address", "en", site.address.en),
      phone: setting(settings, "contact_phone", "en", site.phone),
      email: setting(settings, "contact_email", "en", site.email),
    },
  };
}
