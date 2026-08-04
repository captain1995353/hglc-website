import { notFound } from "next/navigation";
import { requireAdmin } from "@/app/actions/admin/guard";
import { setEnrollmentStatus, setStudentAdmin, updateStudent } from "@/app/actions/admin/people";
import {
  AdminHeader,
  BackLink,
  Field,
  FlashMessage,
  Panel,
  StatusBadge,
  TableShell,
} from "@/components/admin/ui";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import type { EnrollmentStatus } from "@/lib/types";

const STATUSES: EnrollmentStatus[] = [
  "pending_payment",
  "active",
  "completed",
  "cancelled",
];

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { db, user } = await requireAdmin();
  const { id } = await params;
  const { saved, error } = await searchParams;

  const { data: student } = await db
    .from("profiles")
    .select("id, full_name, phone, is_admin, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!student) notFound();

  const { data: enrolments } = await db
    .from("enrollments")
    .select("id, status, created_at, note, course:courses (title_en), batch:batches (name, start_date)")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  const { data: payments } = await db
    .from("payments")
    .select("id, provider, status, amount, currency, tran_id, provider_ref, created_at")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  const paidTotal = (payments ?? [])
    .filter((p) => p.status === "paid" && p.currency === "BDT")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <>
      <BackLink href="/admin/students">All students</BackLink>
      <AdminHeader
        title={student.full_name || "(no name)"}
        subtitle={`Joined ${formatDate(student.created_at)} · ${formatMoney(paidTotal, "BDT")} paid to date`}
      />

      <FlashMessage
        saved={saved}
        error={error}
        messages={{
          self_demote:
            "You cannot remove your own admin access — ask another admin to do it.",
        }}
      />

      <Panel title="Details">
        <form action={updateStudent} className="grid gap-5 sm:grid-cols-2">
          <input type="hidden" name="id" value={student.id} />
          <Field label="Full name" name="full_name" defaultValue={student.full_name} />
          <Field label="Phone" name="phone" defaultValue={student.phone} />
          <div className="sm:col-span-2">
            <button type="submit" className="btn btn-primary">
              Save details
            </button>
          </div>
        </form>
      </Panel>

      <Panel
        title="Dashboard access"
        description="Admins can edit courses, verify payments and see every student."
      >
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm text-ink-600">
            Currently:{" "}
            <strong className="font-semibold text-ink-900">
              {student.is_admin ? "Administrator" : "Student"}
            </strong>
          </span>
          <form action={setStudentAdmin}>
            <input type="hidden" name="id" value={student.id} />
            <input type="hidden" name="is_admin" value={String(!student.is_admin)} />
            <button
              type="submit"
              className={student.is_admin ? "btn btn-outline" : "btn btn-primary"}
              disabled={student.is_admin && student.id === user.id}
            >
              {student.is_admin ? "Remove admin access" : "Make administrator"}
            </button>
          </form>
        </div>
      </Panel>

      <Panel title="Enrolments">
        {(enrolments ?? []).length === 0 ? (
          <p className="text-sm text-ink-500">Not enrolled in anything yet.</p>
        ) : (
          <TableShell head={["Course", "Batch", "Enrolled", "Status"]} minWidth="40rem">
            {(enrolments ?? []).map((row) => {
              const course = (
                Array.isArray(row.course) ? row.course[0] : row.course
              ) as { title_en: string } | null;
              const batch = (
                Array.isArray(row.batch) ? row.batch[0] : row.batch
              ) as { name: string; start_date: string } | null;

              return (
                <tr key={row.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-ink-800">
                    {course?.title_en ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-ink-600">
                    {batch?.name ?? "—"}
                    {batch && (
                      <span className="block text-xs text-ink-400">
                        {formatDate(batch.start_date)}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-ink-500">
                    {formatDate(row.created_at)}
                  </td>
                  <td className="px-5 py-3">
                    <form action={setEnrollmentStatus} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={row.id} />
                      <select
                        name="status"
                        defaultValue={row.status}
                        className="field-input py-1.5 text-xs"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="btn btn-outline px-3 py-1.5 text-xs">
                        Set
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </TableShell>
        )}
      </Panel>

      <Panel title="Payments">
        {(payments ?? []).length === 0 ? (
          <p className="text-sm text-ink-500">No payments yet.</p>
        ) : (
          <TableShell head={["Date", "Method", "Amount", "Status", "Reference"]}>
            {(payments ?? []).map((row) => (
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
                  {row.provider_ref || row.tran_id}
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>
    </>
  );
}
