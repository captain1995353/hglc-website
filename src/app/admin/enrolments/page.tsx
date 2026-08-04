import Link from "next/link";
import { requireAdmin } from "@/app/actions/admin/guard";
import {
  createEnrollment,
  recordOfflinePayment,
  setEnrollmentStatus,
} from "@/app/actions/admin/people";
import {
  AdminHeader,
  EmptyState,
  FlashMessage,
  Panel,
  StatusBadge,
  TableShell,
} from "@/components/admin/ui";
import { formatDate } from "@/lib/format";
import type { EnrollmentStatus } from "@/lib/types";

const STATUSES: EnrollmentStatus[] = [
  "pending_payment",
  "active",
  "completed",
  "cancelled",
];

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending_payment", label: "Payment due" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default async function AdminEnrolmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; created?: string; error?: string }>;
}) {
  const { db } = await requireAdmin();
  const { status, created, error } = await searchParams;
  const active = STATUSES.includes(status as EnrollmentStatus) ? status : "all";

  let query = db
    .from("enrollments")
    .select(
      "id, status, created_at, user_id, course:courses (title_en), batch:batches (name, start_date, mode)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (active !== "all") query = query.eq("status", active);

  const { data: enrolments } = await query;

  const userIds = [...new Set((enrolments ?? []).map((row) => row.user_id))];
  const { data: profiles } = userIds.length
    ? await db.from("profiles").select("id, full_name, phone").in("id", userIds)
    : { data: [] };

  const profileById = new Map(
    (profiles ?? []).map((p) => [p.id, p as { full_name: string; phone: string }]),
  );

  // Options for the manual enrolment form.
  const [{ data: openBatches }, { data: students }] = await Promise.all([
    db
      .from("batches")
      .select("id, name, start_date, course:courses (title_en)")
      .eq("is_open", true)
      .order("start_date", { ascending: true }),
    db
      .from("profiles")
      .select("id, full_name, phone")
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  return (
    <>
      <AdminHeader
        title="Enrolments"
        subtitle="Who is in which batch, and whether they have paid."
      />

      <FlashMessage
        saved={created}
        error={error}
        savedText="Student enrolled."
        messages={{
          already_enrolled: "That student is already in this batch.",
          fields: "Pick both a student and a batch.",
          batch: "That batch no longer exists.",
        }}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const href =
            filter.value === "all"
              ? "/admin/enrolments"
              : `/admin/enrolments?status=${filter.value}`;
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

      {(enrolments ?? []).length === 0 ? (
        <EmptyState>Nothing here yet.</EmptyState>
      ) : (
        <TableShell
          head={["Student", "Course", "Batch", "Enrolled", "Status", "Fee"]}
          minWidth="56rem"
        >
          {(enrolments ?? []).map((row) => {
            const profile = profileById.get(row.user_id);
            const course = (
              Array.isArray(row.course) ? row.course[0] : row.course
            ) as { title_en: string } | null;
            const batch = (
              Array.isArray(row.batch) ? row.batch[0] : row.batch
            ) as { name: string; start_date: string; mode: string } | null;

            return (
              <tr key={row.id} className="border-b border-ink-50 last:border-0">
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/students/${row.user_id}`}
                    className="font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {profile?.full_name || "(no name)"}
                  </Link>
                  <span className="block text-xs text-ink-400">{profile?.phone}</span>
                </td>
                <td className="px-5 py-3 text-ink-700">{course?.title_en ?? "—"}</td>
                <td className="px-5 py-3 text-ink-600">
                  {batch?.name ?? "—"}
                  {batch && (
                    <span className="block text-xs text-ink-400">
                      {formatDate(batch.start_date)} · {batch.mode}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-ink-500">{formatDate(row.created_at)}</td>
                <td className="px-5 py-3">
                  <form action={setEnrollmentStatus} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <select
                      name="status"
                      defaultValue={row.status}
                      className="field-input py-1.5 text-xs"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn btn-outline px-3 py-1.5 text-xs">
                      Set
                    </button>
                  </form>
                </td>
                <td className="px-5 py-3">
                  {row.status === "pending_payment" ? (
                    <form action={recordOfflinePayment}>
                      <input type="hidden" name="enrollment_id" value={row.id} />
                      <button
                        type="submit"
                        className="btn btn-primary px-3 py-1.5 text-xs"
                        title="Marks the course fee as paid in cash and activates the enrolment"
                      >
                        Paid at centre
                      </button>
                    </form>
                  ) : (
                    <StatusBadge status={row.status} />
                  )}
                </td>
              </tr>
            );
          })}
        </TableShell>
      )}

      <Panel
        title="Enrol a student by hand"
        description="For walk-ins who signed up at the centre. Create their account first if they do not have one."
      >
        <form action={createEnrollment} className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="user_id">
              Student
            </label>
            <select id="user_id" name="user_id" className="field-input" required>
              <option value="">Choose a student…</option>
              {(students ?? []).map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name || "(no name)"}
                  {student.phone ? ` · ${student.phone}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="batch_id">
              Batch
            </label>
            <select id="batch_id" name="batch_id" className="field-input" required>
              <option value="">Choose a batch…</option>
              {(openBatches ?? []).map((batch) => {
                const course = (
                  Array.isArray(batch.course) ? batch.course[0] : batch.course
                ) as { title_en: string } | null;
                return (
                  <option key={batch.id} value={batch.id}>
                    {course?.title_en} — {batch.name} ({formatDate(batch.start_date)})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="status">
              Status
            </label>
            <select id="status" name="status" defaultValue="active" className="field-input">
              <option value="active">Active (already paid)</option>
              <option value="pending_payment">Payment due</option>
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="note">
              Note
            </label>
            <input id="note" name="note" className="field-input" placeholder="Optional" />
          </div>

          <div className="sm:col-span-2">
            <button type="submit" className="btn btn-primary">
              Enrol student
            </button>
          </div>
        </form>
      </Panel>
    </>
  );
}
