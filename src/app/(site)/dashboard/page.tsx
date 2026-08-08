import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getI18n, pick } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { listMyEnrollments, listMyPayments } from "@/lib/data";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { updateProfile } from "@/app/actions/auth";
import { StudentClassroom } from "@/components/StudentClassroom";
import type { Batch, Course, EnrollmentStatus, PaymentStatus } from "@/lib/types";

export const metadata: Metadata = { title: "My Learning", robots: { index: false } };

function first<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function DashboardPage() {
  const { locale, t } = await getI18n();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  const [enrollments, payments] = await Promise.all([
    listMyEnrollments(user.id),
    listMyPayments(user.id),
  ]);

  // Classes the student is actually attending drive the classroom section.
  const activeEnrolments = enrollments.filter(
    (row) => row.status === "active" || row.status === "completed",
  );
  const enrollmentIds = activeEnrolments.map((row) => row.id as string);
  const batchIds = [
    ...new Set(
      activeEnrolments
        .map((row) => row.batch_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const statusLabel: Record<EnrollmentStatus, string> = {
    pending_payment: t.dashboard.statusPendingPayment,
    active: t.dashboard.statusActive,
    completed: t.dashboard.statusCompleted,
    cancelled: t.dashboard.statusCancelled,
  };

  const statusTone: Record<EnrollmentStatus, string> = {
    pending_payment: "bg-coral-50 text-coral-700",
    active: "bg-brand-50 text-brand-700",
    completed: "bg-ink-100 text-ink-600",
    cancelled: "bg-ink-100 text-ink-400",
  };

  const paymentTone: Record<PaymentStatus, string> = {
    paid: "bg-brand-50 text-brand-700",
    pending_review: "bg-paper-dim text-ink-600",
    initiated: "bg-paper-dim text-ink-500",
    failed: "bg-coral-50 text-coral-700",
    cancelled: "bg-ink-100 text-ink-500",
    refunded: "bg-ink-100 text-ink-600",
  };

  return (
    <div className="container-page py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight">{t.dashboard.title}</h1>
      <p className="mt-2 text-ink-500">
        {t.dashboard.greeting}, {profile?.full_name || user.email}
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div>
          {/* ---------------- Enrolments ---------------- */}
          <h2 className="text-xl font-bold tracking-tight">{t.dashboard.enrolments}</h2>

          {enrollments.length === 0 ? (
            <div className="card mt-4 p-8 text-center">
              <p className="text-ink-500">{t.dashboard.noEnrolments}</p>
              <Link href="/courses" className="btn btn-primary mt-5">
                {t.dashboard.browse}
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {enrollments.map((row) => {
                const course = first(row.course as unknown as Course | Course[]);
                const batch = first(row.batch as unknown as Batch | Batch[]);
                const status = row.status as EnrollmentStatus;

                return (
                  <article key={row.id} className="card p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-ink-900">
                          {course ? pick(course, "title", locale) : "—"}
                        </h3>
                        {batch && (
                          <p className="mt-1 text-sm text-ink-500">
                            {t.dashboard.batch}: {batch.name}
                          </p>
                        )}
                      </div>
                      <span className={`badge ${statusTone[status]}`}>
                        {statusLabel[status]}
                      </span>
                    </div>

                    {batch && (
                      <dl className="mt-4 grid gap-x-8 gap-y-2 border-t border-ink-100 pt-4 text-sm sm:grid-cols-2">
                        <div className="flex gap-2">
                          <dt className="text-ink-400">{t.dashboard.startsOn}</dt>
                          <dd className="font-medium text-ink-800">
                            {formatDate(batch.start_date, locale)}
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="text-ink-400">{t.course.schedule}</dt>
                          <dd className="font-medium text-ink-800">
                            {batch.schedule_text}
                          </dd>
                        </div>
                        {status === "active" && batch.room_or_link && (
                          <div className="flex gap-2 sm:col-span-2">
                            <dt className="text-ink-400">{t.dashboard.classroom}</dt>
                            <dd className="font-medium text-ink-800">
                              {batch.room_or_link.startsWith("http") ? (
                                <a
                                  href={batch.room_or_link}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="text-brand-700 underline"
                                >
                                  {batch.room_or_link}
                                </a>
                              ) : (
                                batch.room_or_link
                              )}
                            </dd>
                          </div>
                        )}
                      </dl>
                    )}

                    {status === "pending_payment" && (
                      <Link href={`/checkout/${row.id}`} className="btn btn-primary mt-5">
                        {t.dashboard.payNow}
                      </Link>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {/* ---------------- Payments ---------------- */}
          <h2 className="mt-12 text-xl font-bold tracking-tight">
            {t.dashboard.payments}
          </h2>

          {payments.length === 0 ? (
            <p className="card mt-4 p-6 text-sm text-ink-500">{t.dashboard.noPayments}</p>
          ) : (
            <div className="card mt-4 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                    <th className="px-5 py-3 font-semibold">{t.dashboard.date}</th>
                    <th className="px-5 py-3 font-semibold">{t.dashboard.method}</th>
                    <th className="px-5 py-3 font-semibold">{t.dashboard.amount}</th>
                    <th className="px-5 py-3 font-semibold">{t.dashboard.status}</th>
                    <th className="px-5 py-3 font-semibold">{t.dashboard.reference}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-ink-50 last:border-0">
                      <td className="px-5 py-3 text-ink-600">
                        {formatDateTime(payment.created_at, locale)}
                      </td>
                      <td className="px-5 py-3 capitalize text-ink-600">
                        {payment.provider}
                      </td>
                      <td className="px-5 py-3 font-semibold text-ink-900">
                        {formatMoney(Number(payment.amount), payment.currency, locale)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`badge ${paymentTone[payment.status as PaymentStatus]}`}
                        >
                          {payment.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-ink-500">
                        {payment.provider_ref || payment.tran_id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <StudentClassroom
            enrollmentIds={enrollmentIds}
            batchIds={batchIds}
          />
        </div>

        {/* ---------------- Profile ---------------- */}
        <aside className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-400">
            {t.dashboard.profileTitle}
          </h2>

          <form action={updateProfile} className="mt-5 space-y-4">
            <div>
              <label className="field-label" htmlFor="full_name">
                {t.auth.fullName}
              </label>
              <input
                id="full_name"
                name="full_name"
                defaultValue={profile?.full_name ?? ""}
                className="field-input"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="phone">
                {t.auth.phone}
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={profile?.phone ?? ""}
                className="field-input"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="email">
                {t.auth.email}
              </label>
              <input
                id="email"
                value={user.email ?? ""}
                readOnly
                disabled
                className="field-input bg-paper-dim text-ink-400"
              />
            </div>

            <button type="submit" className="btn btn-outline w-full">
              {t.dashboard.save}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
