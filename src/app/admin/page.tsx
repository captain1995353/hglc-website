import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/app/actions/admin/guard";
import { StatusBadge } from "@/components/admin/ui";
import {
  ChartCard,
  EmptyChart,
  RankedBars,
  StatusBar,
  TrendArea,
} from "@/components/admin/charts";
import { LogoMark } from "@/components/LogoMark";
import { LocalTime } from "@/components/LocalTime";
import { formatMoney } from "@/lib/format";
import { getSettings, setting } from "@/lib/settings";
import { getAdmissionState } from "@/lib/admissions";
import { site } from "@/lib/site";

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

/** A stat tile: the number is the point, the icon is decoration. */
function Tile({
  label,
  value,
  hint,
  tint,
  icon,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  tint: string;
  icon: React.ReactNode;
  href?: string;
}) {
  const body = (
    <div className="card flex items-center justify-between gap-4 p-5 transition-shadow hover:shadow-md">
      <div className="min-w-0">
        <p className="text-sm text-ink-500">{label}</p>
        <p className="mt-1 truncate text-3xl font-bold tracking-tight text-ink-900">
          {value}
        </p>
        {hint && <p className="mt-0.5 text-xs text-ink-400">{hint}</p>}
      </div>
      <span
        aria-hidden
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${tint}`}
      >
        {icon}
      </span>
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}

const svg = (path: React.ReactNode) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {path}
  </svg>
);

export default async function AdminOverviewPage() {
  const { db, role, profile } = await requireRole();

  // Teachers have no business on the money screens; their landing page is
  // their own class list.
  if (role === "teacher") redirect("/admin/classes");

  const [{ data: statsData }, settings, admissions] = await Promise.all([
    db.rpc("admin_stats"),
    getSettings(),
    getAdmissionState(),
  ]);
  const stats: Stats = { ...EMPTY_STATS, ...((statsData as Stats) ?? {}) };

  // Enrolments by status, and which courses students actually pick.
  const { data: enrolments } = await db
    .from("enrollments")
    .select("status, course:courses (title_en)");

  const statusCounts = new Map<string, number>();
  const courseCounts = new Map<string, number>();

  for (const row of enrolments ?? []) {
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);

    if (row.status === "active" || row.status === "completed") {
      const course = (
        Array.isArray(row.course) ? row.course[0] : row.course
      ) as { title_en: string } | null;
      const title = course?.title_en ?? "Unknown course";
      courseCounts.set(title, (courseCounts.get(title) ?? 0) + 1);
    }
  }

  // Six months of collections, aggregated here rather than in SQL — the
  // volume is small and it saves a migration.
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const { data: paidRows } = await db
    .from("payments")
    .select("amount, currency, verified_at, created_at")
    .eq("status", "paid")
    .eq("currency", "BDT")
    .gte("created_at", sixMonthsAgo.toISOString());

  const months: { key: string; label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - i);
    months.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString("en-GB", { month: "short" }),
      value: 0,
    });
  }
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));

  for (const row of paidRows ?? []) {
    const when = new Date(row.verified_at ?? row.created_at);
    const key = `${when.getFullYear()}-${when.getMonth()}`;
    const index = monthIndex.get(key);
    if (index !== undefined) months[index].value += Number(row.amount);
  }

  const { data: recentPayments } = await db
    .from("payments")
    .select("id, provider, status, amount, currency, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(6);

  const payerIds = [...new Set((recentPayments ?? []).map((p) => p.user_id))];
  const { data: payers } = payerIds.length
    ? await db.from("profiles").select("id, full_name").in("id", payerIds)
    : { data: [] };
  const nameById = new Map(
    (payers ?? []).map((p) => [p.id, p.full_name as string | null]),
  );

  const address = setting(settings, "address", "en", site.address.en);
  const phone = setting(settings, "contact_phone", "en", site.phone);

  const attention = [
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
      {/* ---------------- Centre summary ---------------- */}
      <section className="card mb-6 overflow-hidden">
        <div className="flex flex-wrap items-start gap-6 p-6 sm:p-7">
          <LogoMark className="h-20 w-20 shrink-0" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-ink-900">
                {site.name}
              </h1>
              <span
                className={`badge ${
                  admissions.open
                    ? "bg-brand-50 text-brand-700"
                    : "bg-coral-50 text-coral-700"
                }`}
              >
                {admissions.open ? "Admissions open" : "Admissions closed"}
              </span>
            </div>

            <p className="mt-1.5 text-sm text-ink-500">
              {address} · {phone}
            </p>

            {admissions.open && admissions.window && (
              <p className="mt-1 text-sm text-ink-500">
                {admissions.window.title} — closes{" "}
                <LocalTime iso={admissions.window.closes_at} />
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/admin/enrolments" className="btn btn-primary px-4 py-2 text-sm">
                Enrolments
              </Link>
              <Link href="/admin/payments" className="btn btn-outline px-4 py-2 text-sm">
                Verify payments
              </Link>
              {role === "admin" && (
                <Link
                  href="/admin/admissions"
                  className="btn btn-outline px-4 py-2 text-sm"
                >
                  Admissions
                </Link>
              )}
            </div>
          </div>

          <div className="hidden text-right lg:block">
            <p className="text-xs uppercase tracking-[0.12em] text-ink-400">
              Signed in
            </p>
            <p className="text-sm font-semibold text-ink-900">
              {profile.full_name || "Administrator"}
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- KPI row ---------------- */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          label="Students"
          value={String(stats.students)}
          href="/admin/students"
          tint="bg-coral-50 text-coral-600"
          icon={svg(
            <>
              <circle cx="9" cy="8" r="3.2" />
              <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
              <path d="M16 8.5a3 3 0 0 1 0 5" />
            </>,
          )}
        />
        <Tile
          label="Active enrolments"
          value={String(stats.active_enrolments)}
          hint={`${stats.pending_enrolments} awaiting payment`}
          href="/admin/enrolments"
          tint="bg-brand-50 text-brand-700"
          icon={svg(
            <>
              <path d="M6 3h9l5 5v13H6z" />
              <path d="M9.5 15.5l1.8 1.8 3.4-3.6" />
            </>,
          )}
        />
        <Tile
          label="Collected"
          value={formatMoney(stats.revenue_bdt, "BDT")}
          hint={`${formatMoney(stats.revenue_bdt_30d, "BDT")} in the last 30 days`}
          href="/admin/payments?status=paid"
          tint="bg-plum-50 text-plum-700"
          icon={svg(
            <>
              <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
              <path d="M2.5 10.5h19" />
            </>,
          )}
        />
        <Tile
          label="Open batches"
          value={String(stats.open_batches)}
          hint={`${stats.courses} live courses`}
          href="/admin/courses"
          tint="bg-ink-100 text-ink-700"
          icon={svg(
            <>
              <path d="M4 5h16v11H4z" />
              <path d="M8 20h8" />
            </>,
          )}
        />
      </div>

      {/* ---------------- Needs attention ---------------- */}
      {attention.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {attention.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="card flex items-center justify-between gap-3 border-coral-200 p-4 transition-shadow hover:shadow-md"
            >
              <span className="text-sm font-medium text-ink-700">{item.label}</span>
              <span className="badge bg-coral-500 text-white">{item.value}</span>
            </Link>
          ))}
        </div>
      )}

      {/* ---------------- Charts ---------------- */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Money collected"
          subtitle="Confirmed payments per month, in Taka"
          className="lg:col-span-2"
        >
          <TrendArea
            data={months.map((m) => ({ label: m.label, value: m.value }))}
            format={(value) => formatMoney(value, "BDT")}
          />
        </ChartCard>

        <ChartCard title="Enrolments by status" subtitle="Every enrolment on record">
          <StatusBar
            data={[...statusCounts].map(([key, value]) => ({ key, value }))}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Students per course"
          subtitle="Active and completed enrolments"
        >
          <RankedBars
            data={[...courseCounts].map(([label, value]) => ({ label, value }))}
          />
        </ChartCard>

        <ChartCard title="Latest payments" subtitle="Newest first">
          {(recentPayments ?? []).length === 0 ? (
            <EmptyChart>No payments yet.</EmptyChart>
          ) : (
            <ul className="divide-y divide-ink-100">
              {(recentPayments ?? []).map((row) => (
                <li key={row.id} className="flex items-center gap-3 py-3 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink-800">
                      {nameById.get(row.user_id) || "—"}
                    </span>
                    <span className="block text-xs capitalize text-ink-400">
                      {row.provider} · <LocalTime iso={row.created_at} />
                    </span>
                  </span>
                  <StatusBadge status={row.status} />
                  <span className="w-24 shrink-0 text-right font-semibold text-ink-900">
                    {formatMoney(Number(row.amount), row.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </>
  );
}
