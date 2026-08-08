import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings, setting } from "@/lib/settings";
import { formatMoney } from "@/lib/format";
import { LocalTime } from "@/components/LocalTime";
import { LogoMark } from "@/components/LogoMark";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Invoice", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * A printable invoice for one confirmed payment. Readable by the student it
 * belongs to, and by staff; nobody else, even with the link.
 */
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/invoice/${paymentId}`);

  const db = createAdminClient();

  const { data: payment } = await db
    .from("payments")
    .select(
      "id, invoice_no, amount, currency, status, provider, provider_ref, verified_at, created_at, user_id, meta, enrollment:enrollments (id, course:courses (title_en, level), batch:batches (name, start_date, schedule_text))",
    )
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) notFound();

  // Staff may open anyone's invoice; a student only their own.
  const { data: profile } = await db
    .from("profiles")
    .select("full_name, phone, role")
    .eq("id", user.id)
    .maybeSingle();

  const isStaff = profile?.role === "admin" || profile?.role === "staff";
  if (payment.user_id !== user.id && !isStaff) notFound();

  const { data: billed } = await db
    .from("profiles")
    .select("full_name, phone")
    .eq("id", payment.user_id)
    .maybeSingle();

  const { data: authUser } = await db.auth.admin.getUserById(payment.user_id);

  const enrollment = (
    Array.isArray(payment.enrollment) ? payment.enrollment[0] : payment.enrollment
  ) as {
    course: { title_en: string; level: string } | { title_en: string; level: string }[];
    batch:
      | { name: string; start_date: string; schedule_text: string }
      | { name: string; start_date: string; schedule_text: string }[]
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
        : enrollment.batch) as {
        name: string;
        start_date: string;
        schedule_text: string;
      } | null)
    : null;

  const settings = await getSettings();
  const address = setting(settings, "address", "en", site.address.en);
  const phone = setting(settings, "contact_phone", "en", site.phone);
  const email = setting(settings, "contact_email", "en", site.email);

  const channel = String((payment.meta as Record<string, unknown>)?.channel ?? "");
  const methodLabel =
    payment.provider === "manual"
      ? channel === "cash"
        ? "Cash at the centre"
        : channel === "bank"
          ? "Bank transfer"
          : channel
            ? channel.charAt(0).toUpperCase() + channel.slice(1)
            : "Manual transfer"
      : payment.provider === "sslcommerz"
        ? "Card / mobile wallet (SSLCommerz)"
        : "Card (Stripe)";

  const paid = payment.status === "paid";

  return (
    <div className="container-page py-10 print:py-0">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex flex-wrap justify-end gap-3 print:hidden">
          <a href="/dashboard" className="btn btn-ghost">
            Back to My Learning
          </a>
          <a href={`/invoice/${paymentId}/pdf`} className="btn btn-primary">
            Download PDF
          </a>
        </div>

        <article className="card p-8 print:border-0 print:shadow-none">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-100 pb-6">
            <div className="flex items-center gap-3">
              <LogoMark className="h-11 w-11" />
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.02em] text-ink-900">
                  Hangeul
                </p>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ink-400">
                  Global Learning Center
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.12em] text-ink-400">
                {paid ? "Invoice" : "Payment record"}
              </p>
              <p className="font-mono text-lg font-bold text-ink-900">
                {payment.invoice_no ?? "—"}
              </p>
              {!paid && (
                <span className="badge mt-1 bg-coral-50 text-coral-700">
                  {payment.status.replace(/_/g, " ")}
                </span>
              )}
            </div>
          </header>

          <div className="grid gap-6 border-b border-ink-100 py-6 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-ink-400">From</p>
              <p className="mt-1 font-semibold text-ink-900">{site.name}</p>
              <p className="whitespace-pre-line text-sm text-ink-600">{address}</p>
              <p className="text-sm text-ink-600">{phone}</p>
              <p className="text-sm text-ink-600">{email}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-ink-400">
                Billed to
              </p>
              <p className="mt-1 font-semibold text-ink-900">
                {billed?.full_name || "Student"}
              </p>
              {authUser?.user?.email && (
                <p className="text-sm text-ink-600">{authUser.user.email}</p>
              )}
              {billed?.phone && <p className="text-sm text-ink-600">{billed.phone}</p>}
            </div>
          </div>

          <table className="w-full border-b border-ink-100 py-4 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-ink-400">
                <th className="py-3 font-semibold">Description</th>
                <th className="py-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-3">
                  <p className="font-semibold text-ink-900">
                    {course?.title_en ?? "Course enrolment"}
                  </p>
                  {course?.level && (
                    <p className="text-xs text-ink-400">{course.level}</p>
                  )}
                  {batch && (
                    <p className="mt-1 text-xs text-ink-500">
                      {batch.name}
                      {batch.schedule_text ? ` · ${batch.schedule_text}` : ""}
                    </p>
                  )}
                </td>
                <td className="py-3 text-right font-semibold text-ink-900">
                  {formatMoney(Number(payment.amount), payment.currency)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="flex items-baseline justify-between py-5">
            <span className="font-semibold text-ink-900">
              {paid ? "Total paid" : "Total"}
            </span>
            <span className="text-2xl font-bold text-ink-900">
              {formatMoney(Number(payment.amount), payment.currency)}
            </span>
          </div>

          <dl className="grid gap-x-8 gap-y-2 border-t border-ink-100 pt-5 text-sm sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="text-ink-400">Method</dt>
              <dd className="font-medium text-ink-800">{methodLabel}</dd>
            </div>
            {payment.provider_ref && (
              <div className="flex gap-2">
                <dt className="text-ink-400">Reference</dt>
                <dd className="font-mono text-ink-800">{payment.provider_ref}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="text-ink-400">{paid ? "Confirmed" : "Submitted"}</dt>
              <dd className="text-ink-800">
                <LocalTime iso={payment.verified_at ?? payment.created_at} />
              </dd>
            </div>
          </dl>

          <p className="mt-8 text-xs text-ink-400">
            This invoice was generated by {site.name}. Keep it for your records.
          </p>
        </article>
      </div>
    </div>
  );
}
