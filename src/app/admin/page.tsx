import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  approveManualPayment,
  rejectManualPayment,
  requireAdmin,
} from "@/app/actions/admin";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

type PendingRow = {
  id: string;
  tran_id: string;
  provider_ref: string | null;
  sender_number: string | null;
  amount: number;
  currency: string;
  created_at: string;
  user_id: string;
  meta: Record<string, unknown> | null;
  enrollment: { id: string; course: { title_en: string } | null } | null;
};

export default async function AdminPage() {
  await requireAdmin();
  const { locale, t } = await getI18n();

  const client = createAdminClient();

  const { data: pendingRaw } = await client
    .from("payments")
    .select(
      `id, tran_id, provider_ref, sender_number, amount, currency, created_at, user_id, meta,
       enrollment:enrollments (id, course:courses (title_en))`,
    )
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });

  const pending = (pendingRaw ?? []) as unknown as PendingRow[];

  // Student names come from profiles — payments FK to auth.users, so this
  // is a second lookup rather than a join.
  const userIds = [...new Set(pending.map((p) => p.user_id))];
  const { data: profiles } = userIds.length
    ? await client.from("profiles").select("id, full_name, phone").in("id", userIds)
    : { data: [] };

  const profileById = new Map(
    (profiles ?? []).map((p) => [p.id, p as { full_name: string; phone: string }]),
  );

  const { data: recent } = await client
    .from("payments")
    .select("id, provider, status, amount, currency, tran_id, created_at")
    .order("created_at", { ascending: false })
    .limit(25);

  const { data: messages } = await client
    .from("contact_messages")
    .select("id, name, email, phone, subject, message, created_at")
    .order("created_at", { ascending: false })
    .limit(15);

  return (
    <div className="container-page py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight">{t.admin.title}</h1>

      {/* ---------------- Manual payments awaiting review ---------------- */}
      <h2 className="mt-10 text-xl font-bold tracking-tight">{t.admin.pendingTitle}</h2>

      {pending.length === 0 ? (
        <p className="card mt-4 p-6 text-sm text-ink-500">{t.admin.noPending}</p>
      ) : (
        <div className="mt-4 space-y-4">
          {pending.map((payment) => {
            const profile = profileById.get(payment.user_id);
            const channel = String(payment.meta?.channel ?? "manual");

            return (
              <div key={payment.id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-ink-900">
                        {profile?.full_name || payment.user_id.slice(0, 8)}
                      </h3>
                      <span className="badge bg-ink-100 capitalize text-ink-600">
                        {channel}
                      </span>
                    </div>

                    <dl className="mt-3 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
                      <div className="flex gap-2">
                        <dt className="text-ink-400">{t.admin.course}</dt>
                        <dd className="font-medium text-ink-800">
                          {payment.enrollment?.course?.title_en ?? "—"}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-ink-400">{t.dashboard.amount}</dt>
                        <dd className="font-medium text-ink-800">
                          {formatMoney(Number(payment.amount), payment.currency, locale)}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-ink-400">TrxID</dt>
                        <dd className="font-mono font-semibold text-ink-900">
                          {payment.provider_ref}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-ink-400">{t.checkout.manualSender}</dt>
                        <dd className="font-mono text-ink-800">
                          {payment.sender_number}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-ink-400">{t.dashboard.date}</dt>
                        <dd className="text-ink-600">
                          {formatDateTime(payment.created_at, locale)}
                        </dd>
                      </div>
                      {profile?.phone && (
                        <div className="flex gap-2">
                          <dt className="text-ink-400">{t.auth.phone}</dt>
                          <dd className="text-ink-600">{profile.phone}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="flex gap-2">
                    <form action={approveManualPayment}>
                      <input type="hidden" name="tran_id" value={payment.tran_id} />
                      <input
                        type="hidden"
                        name="provider_ref"
                        value={payment.provider_ref ?? ""}
                      />
                      <button type="submit" className="btn btn-primary whitespace-nowrap">
                        {t.admin.approve}
                      </button>
                    </form>
                    <form action={rejectManualPayment}>
                      <input type="hidden" name="tran_id" value={payment.tran_id} />
                      <button type="submit" className="btn btn-outline">
                        {t.admin.reject}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- Recent payments ---------------- */}
      <h2 className="mt-12 text-xl font-bold tracking-tight">{t.admin.allPayments}</h2>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[38rem] text-left text-sm">
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
            {(recent ?? []).map((row) => (
              <tr key={row.id} className="border-b border-ink-50 last:border-0">
                <td className="px-5 py-3 text-ink-600">
                  {formatDateTime(row.created_at, locale)}
                </td>
                <td className="px-5 py-3 capitalize text-ink-600">{row.provider}</td>
                <td className="px-5 py-3 font-semibold text-ink-900">
                  {formatMoney(Number(row.amount), row.currency, locale)}
                </td>
                <td className="px-5 py-3 capitalize text-ink-600">
                  {row.status.replace("_", " ")}
                </td>
                <td className="px-5 py-3 font-mono text-xs text-ink-500">
                  {row.tran_id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------------- Contact messages ---------------- */}
      <h2 className="mt-12 text-xl font-bold tracking-tight">{t.admin.messages}</h2>
      <div className="mt-4 space-y-3">
        {(messages ?? []).map((message) => (
          <div key={message.id} className="card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="font-semibold text-ink-900">
                {message.name}{" "}
                <span className="font-normal text-ink-400">· {message.email}</span>
                {message.phone && (
                  <span className="font-normal text-ink-400"> · {message.phone}</span>
                )}
              </p>
              <p className="text-xs text-ink-400">
                {formatDateTime(message.created_at, locale)}
              </p>
            </div>
            {message.subject && (
              <p className="mt-1 text-sm font-medium text-ink-700">{message.subject}</p>
            )}
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-600">
              {message.message}
            </p>
          </div>
        ))}
        {(messages ?? []).length === 0 && (
          <p className="card p-6 text-sm text-ink-500">—</p>
        )}
      </div>
    </div>
  );
}
