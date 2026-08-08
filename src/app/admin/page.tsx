import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/app/actions/admin/guard";
import { AdminHeader, Panel, StatusBadge, TableShell } from "@/components/admin/ui";
import { formatDateTime, formatMoney } from "@/lib/format";

type Stats = {
  students: number;
  courses: number;
  open_batches: number;
  active_enrolments: number;
  pending_enrolments: number;
  payments_to_review: number;
  unread_messages: number;
  revenue_bdt: number;
  revenue_usd: number;
  revenue_bdt_30d: number;
};

const EMPTY_STATS: Stats = {
  students: 0,
  courses: 0,
  open_batches: 0,
  active_enrolments: 0,
  pending_enrolments: 0,
  payments_to_review: 0,
  unread_messages: 0,
  revenue_bdt: 0,
  revenue_usd: 0,
  revenue_bdt_30d: 0,
};

export default async function AdminOverviewPage() {
  const { db, role } = await requireRole();

  // Teachers have no business on the money screens; their landing page is
  // their own class list. Redirecting here rather than in requireRole keeps
  // the guard from bouncing them back to /admin in a loop.
  if (role === "teacher") redirect("/admin/classes");

  const { data: statsData } = await db.rpc("admin_stats");
  const stats: Stats = { ...EMPTY_STATS, ...((statsData as Stats) ?? {}) };

  const { data: recentPayments } = await db
    .from("payments")
    .select("id, provider, status, amount, currency, tran_id, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: recentEnrolments } = await db
    .from("enrollments")
    .select("id, status, created_at, course:courses (title_en)")
    .order("created_at", { ascending: false })
    .limit(8);

  const tiles = [
    { label: "Students", value: stats.students, href: "/admin/students", accent: "bg-coral-500" },
    { label: "Active enrolments", value: stats.active_enrolments, href: "/admin/enrolments", accent: "bg-ink-800" },
    { label: "Open batches", value: stats.open_batches, href: "/admin/courses", accent: "bg-brand-600" },
    { label: "Live courses", value: stats.courses, href: "/admin/courses", accent: "bg-plum-600" },
  ];

  const needsAttention = [
    {
      label: "Payments awaiting verification",
      value: stats.payments_to_review,
      href: "/admin/payments?status=pending_review",
    },
    {
      label: "Enrolments not yet paid",
      value: stats.pending_enrolments,
      href: "/admin/enrolments?status=pending_payment",
    },
    { label: "Unread messages", value: stats.unread_messages, href: "/admin/messages" },
  ].filter((item) => item.value > 0);

  return (
    <>
      <AdminHeader
        title="Overview"
        subtitle={
          role === "admin"
            ? "Everything on the site is managed from here."
            : "Enrolments, payments and enquiries."
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className="card overflow-hidden">
            <div className={`h-1.5 ${tile.accent}`} />
            <div className="p-5">
              <p className="text-xs uppercase tracking-[0.12em] text-ink-400">
                {tile.label}
              </p>
              <p className="mt-1 text-3xl font-bold text-ink-900">{tile.value}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-ink-400">
            Collected (BDT)
          </p>
          <p className="mt-1 text-2xl font-bold text-ink-900">
            {formatMoney(stats.revenue_bdt, "BDT")}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-ink-400">
            Last 30 days
          </p>
          <p className="mt-1 text-2xl font-bold text-ink-900">
            {formatMoney(stats.revenue_bdt_30d, "BDT")}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-ink-400">
            Collected (USD)
          </p>
          <p className="mt-1 text-2xl font-bold text-ink-900">
            {formatMoney(stats.revenue_usd, "USD")}
          </p>
        </div>
      </div>

      {needsAttention.length > 0 && (
        <Panel title="Needs your attention">
          <ul className="divide-y divide-ink-100">
            {needsAttention.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between gap-4 py-3 text-sm hover:text-brand-700"
                >
                  <span className="font-medium text-ink-800">{item.label}</span>
                  <span className="badge bg-coral-50 text-coral-700">{item.value}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Latest payments">
        {(recentPayments ?? []).length === 0 ? (
          <p className="text-sm text-ink-500">No payments yet.</p>
        ) : (
          <TableShell head={["Date", "Method", "Amount", "Status", "Reference"]}>
            {(recentPayments ?? []).map((row) => (
              <tr key={row.id} className="border-b border-ink-50 last:border-0">
                <td className="px-5 py-3 text-ink-600">
                  {formatDateTime(row.created_at)}
                </td>
                <td className="px-5 py-3 capitalize text-ink-600">{row.provider}</td>
                <td className="px-5 py-3 font-semibold text-ink-900">
                  {formatMoney(Number(row.amount), row.currency)}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-5 py-3 font-mono text-xs text-ink-500">
                  {row.tran_id}
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>

      <Panel title="Latest enrolments">
        {(recentEnrolments ?? []).length === 0 ? (
          <p className="text-sm text-ink-500">No enrolments yet.</p>
        ) : (
          <TableShell head={["Date", "Course", "Status"]} minWidth="30rem">
            {(recentEnrolments ?? []).map((row) => {
              const course = (
                Array.isArray(row.course) ? row.course[0] : row.course
              ) as { title_en: string } | null;

              return (
                <tr key={row.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-5 py-3 text-ink-600">
                    {formatDateTime(row.created_at)}
                  </td>
                  <td className="px-5 py-3 font-medium text-ink-800">
                    {course?.title_en ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              );
            })}
          </TableShell>
        )}
      </Panel>
    </>
  );
}
