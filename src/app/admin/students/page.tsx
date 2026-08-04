import Link from "next/link";
import { requireAdmin } from "@/app/actions/admin/guard";
import {
  AdminHeader,
  EmptyState,
  StatusBadge,
  TableShell,
} from "@/components/admin/ui";
import { formatDate } from "@/lib/format";

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { db } = await requireAdmin();
  const { q } = await searchParams;
  const search = (q ?? "").trim();

  let query = db
    .from("profiles")
    .select("id, full_name, phone, is_admin, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data: students } = await query;

  // Enrolment counts per student, fetched in one go.
  const ids = (students ?? []).map((s) => s.id);
  const { data: enrolments } = ids.length
    ? await db.from("enrollments").select("user_id, status").in("user_id", ids)
    : { data: [] };

  const counts = new Map<string, { active: number; total: number }>();
  for (const row of enrolments ?? []) {
    const entry = counts.get(row.user_id) ?? { active: 0, total: 0 };
    entry.total += 1;
    if (row.status === "active") entry.active += 1;
    counts.set(row.user_id, entry);
  }

  return (
    <>
      <AdminHeader
        title="Students"
        subtitle="Everyone who has created an account."
      />

      <form className="mb-6 flex gap-2" action="/admin/students">
        <input
          name="q"
          defaultValue={search}
          placeholder="Search by name or phone"
          className="field-input max-w-sm"
        />
        <button type="submit" className="btn btn-outline">
          Search
        </button>
        {search && (
          <Link href="/admin/students" className="btn btn-ghost">
            Clear
          </Link>
        )}
      </form>

      {(students ?? []).length === 0 ? (
        <EmptyState>
          {search ? "No student matches that search." : "No students yet."}
        </EmptyState>
      ) : (
        <TableShell
          head={["Name", "Phone", "Enrolments", "Joined", "Role", ""]}
          minWidth="46rem"
        >
          {(students ?? []).map((student) => {
            const count = counts.get(student.id) ?? { active: 0, total: 0 };

            return (
              <tr key={student.id} className="border-b border-ink-50 last:border-0">
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/students/${student.id}`}
                    className="font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {student.full_name || "(no name)"}
                  </Link>
                </td>
                <td className="px-5 py-3 text-ink-600">{student.phone || "—"}</td>
                <td className="px-5 py-3 text-ink-600">
                  {count.total === 0
                    ? "—"
                    : `${count.active} active / ${count.total} total`}
                </td>
                <td className="px-5 py-3 text-ink-500">
                  {formatDate(student.created_at)}
                </td>
                <td className="px-5 py-3">
                  {student.is_admin ? (
                    <StatusBadge status="admin" />
                  ) : (
                    <span className="text-xs text-ink-400">Student</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/students/${student.id}`}
                    className="text-sm font-semibold text-brand-700 hover:underline"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            );
          })}
        </TableShell>
      )}
    </>
  );
}
