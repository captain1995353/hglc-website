import Link from "next/link";
import { requireAdmin } from "@/app/actions/admin/guard";
import {
  approvePayment,
  refundPayment,
  rejectPayment,
} from "@/app/actions/admin/people";
import {
  AdminHeader,
  EmptyState,
  FlashMessage,
  Panel,
  StatusBadge,
  TableShell,
} from "@/components/admin/ui";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { PaymentStatus } from "@/lib/types";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending_review", label: "To verify" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const VALID: PaymentStatus[] = [
  "initiated",
  "pending_review",
  "paid",
  "failed",
  "cancelled",
  "refunded",
];

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; recorded?: string }>;
}) {
  const { db } = await requireAdmin();
  const { status, recorded } = await searchParams;
  const active = VALID.includes(status as PaymentStatus) ? status! : "all";

  // Manual transfers waiting on a human always sit at the top.
  const { data: pending } = await db
    .from("payments")
    .select(
      "id, tran_id, provider_ref, sender_number, amount, currency, created_at, user_id, meta, enrollment:enrollments (id, course:courses (title_en))",
    )
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });

  let listQuery = db
    .from("payments")
    .select("id, provider, status, amount, currency, tran_id, provider_ref, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(200);

  if (active !== "all") listQuery = listQuery.eq("status", active);

  const { data: payments } = await listQuery;

  const userIds = [
    ...new Set([
      ...(pending ?? []).map((p) => p.user_id),
      ...(payments ?? []).map((p) => p.user_id),
    ]),
  ];
  const { data: profiles } = userIds.length
    ? await db.from("profiles").select("id, full_name, phone").in("id", userIds)
    : { data: [] };

  const profileById = new Map(
    (profiles ?? []).map((p) => [p.id, p as { full_name: string; phone: string }]),
  );

  return (
    <>
      <AdminHeader
        title="Payments"
        subtitle="Gateway payments settle automatically. Manual transfers wait here for you."
      />

      <FlashMessage saved={recorded} savedText="Cash payment recorded." />

      {/* ---------------- Awaiting verification ---------------- */}
      <h2 className="mb-3 text-lg font-bold tracking-tight">
        Awaiting verification{" "}
        {(pending ?? []).length > 0 && (
          <span className="badge bg-coral-50 text-coral-700">
            {(pending ?? []).length}
          </span>
        )}
      </h2>

      {(pending ?? []).length === 0 ? (
        <EmptyState>Nothing waiting. Manual bKash/Nagad transfers show up here.</EmptyState>
      ) : (
        <div className="space-y-4">
          {(pending ?? []).map((payment) => {
            const profile = profileById.get(payment.user_id);
            const enrollment = (
              Array.isArray(payment.enrollment)
                ? payment.enrollment[0]
                : payment.enrollment
            ) as { course: { title_en: string } | { title_en: string }[] } | null;
            const course = enrollment
              ? ((Array.isArray(enrollment.course)
                  ? enrollment.course[0]
                  : enrollment.course) as { title_en: string } | null)
              : null;
            const channel = String(
              (payment.meta as Record<string, unknown>)?.channel ?? "manual",
            );

            return (
              <div key={payment.id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/students/${payment.user_id}`}
                        className="text-base font-bold text-ink-900 hover:text-brand-700"
                      >
                        {profile?.full_name || "(no name)"}
                      </Link>
                      <span className="badge bg-ink-100 capitalize text-ink-600">
                        {channel}
                      </span>
                    </div>

                    <dl className="mt-3 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
                      <div className="flex gap-2">
                        <dt className="text-ink-400">Course</dt>
                        <dd className="font-medium text-ink-800">
                          {course?.title_en ?? "—"}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-ink-400">Amount</dt>
                        <dd className="font-medium text-ink-800">
                          {formatMoney(Number(payment.amount), payment.currency)}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-ink-400">TrxID</dt>
                        <dd className="font-mono font-semibold text-ink-900">
                          {payment.provider_ref}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-ink-400">Sent from</dt>
                        <dd className="font-mono text-ink-800">
                          {payment.sender_number}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-ink-400">Submitted</dt>
                        <dd className="text-ink-600">
                          {formatDateTime(payment.created_at)}
                        </dd>
                      </div>
                      {profile?.phone && (
                        <div className="flex gap-2">
                          <dt className="text-ink-400">Phone</dt>
                          <dd className="text-ink-600">{profile.phone}</dd>
                        </div>
                      )}
                    </dl>

                    <p className="mt-3 text-xs text-ink-400">
                      Check the TrxID against your bKash/Nagad statement before
                      confirming — confirming activates the enrolment.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <form action={approvePayment}>
                      <input type="hidden" name="tran_id" value={payment.tran_id} />
                      <input
                        type="hidden"
                        name="provider_ref"
                        value={payment.provider_ref ?? ""}
                      />
                      <button type="submit" className="btn btn-primary whitespace-nowrap">
                        Confirm payment
                      </button>
                    </form>
                    <form action={rejectPayment}>
                      <input type="hidden" name="tran_id" value={payment.tran_id} />
                      <button type="submit" className="btn btn-outline">
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- Everything ---------------- */}
      <h2 className="mb-3 mt-12 text-lg font-bold tracking-tight">All payments</h2>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const href =
            filter.value === "all"
              ? "/admin/payments"
              : `/admin/payments?status=${filter.value}`;
          const selected = filter.value === active;
          return (
            <Link
              key={filter.value}
              href={href}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                selected
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-ink-200 bg-white text-ink-600 hover:border-ink-300"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {(payments ?? []).length === 0 ? (
        <EmptyState>No payments in this view.</EmptyState>
      ) : (
        <TableShell
          head={["Date", "Student", "Method", "Amount", "Status", "Reference", ""]}
          minWidth="58rem"
        >
          {(payments ?? []).map((row) => {
            const profile = profileById.get(row.user_id);
            return (
              <tr key={row.id} className="border-b border-ink-50 last:border-0">
                <td className="px-5 py-3 text-ink-600">
                  {formatDateTime(row.created_at)}
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/students/${row.user_id}`}
                    className="font-medium text-ink-800 hover:text-brand-700"
                  >
                    {profile?.full_name || "—"}
                  </Link>
                </td>
                <td className="px-5 py-3 capitalize text-ink-600">{row.provider}</td>
                <td className="px-5 py-3 font-semibold text-ink-900">
                  {formatMoney(Number(row.amount), row.currency)}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-5 py-3 font-mono text-xs text-ink-500">
                  {row.provider_ref || row.tran_id}
                </td>
                <td className="px-5 py-3 text-right">
                  {row.status === "paid" && (
                    <form action={refundPayment}>
                      <input type="hidden" name="tran_id" value={row.tran_id} />
                      <button
                        type="submit"
                        className="text-xs font-semibold text-coral-600 hover:underline"
                        title="Marks the payment refunded and cancels the enrolment"
                      >
                        Mark refunded
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
        </TableShell>
      )}

      <Panel title="How money reaches you">
        <ul className="space-y-2 text-sm text-ink-600">
          <li>
            <strong className="text-ink-900">SSLCommerz / Stripe</strong> — confirmed
            automatically by the gateway. Nothing to do here.
          </li>
          <li>
            <strong className="text-ink-900">Manual bKash/Nagad</strong> — the student
            submits a TrxID, you check it against your statement and confirm above.
          </li>
          <li>
            <strong className="text-ink-900">Cash at the centre</strong> — open
            Enrolments and press &ldquo;Paid at centre&rdquo; on that student&rsquo;s row.
          </li>
        </ul>
      </Panel>
    </>
  );
}
