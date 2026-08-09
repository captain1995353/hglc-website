import Link from "next/link";
import { loadBatchStats, loadClass, loadStudentStats } from "@/lib/classroom";
import { AdminHeader, BackLink, EmptyState, Panel, TableShell } from "@/components/admin/ui";
import { ClassTabs } from "@/components/admin/ClassTabs";
import { formatDate } from "@/lib/format";

const MODE_LABEL: Record<string, string> = {
  online: "Live online",
  offline: "On campus",
  hybrid: "Hybrid",
};

function Rate({ value }: { value: number | null }) {
  if (value === null) return <span className="text-ink-400">—</span>;
  const tone =
    value >= 85 ? "text-brand-700" : value >= 65 ? "text-ink-800" : "text-coral-600";
  return <span className={`font-semibold ${tone}`}>{value}%</span>;
}

export default async function ClassOverviewPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const { db, batch, t } = await loadClass(batchId);

  const [stats, students] = await Promise.all([
    loadBatchStats(db, batchId),
    loadStudentStats(db, batchId),
  ]);

  const tiles = [
    { label: t.classes.students, value: String(stats.active_students), accent: "bg-coral-500" },
    { label: t.classes.classesHeld, value: String(stats.sessions_held), accent: "bg-ink-800" },
    {
      label: t.classes.attendanceRate,
      value: stats.attendance_rate === null ? "—" : `${stats.attendance_rate}%`,
      accent: "bg-brand-600",
    },
    {
      label: t.classes.averageScore,
      value: stats.average_score === null ? "—" : String(stats.average_score),
      accent: "bg-plum-600",
    },
  ];

  return (
    <>
      <BackLink href="/admin/classes">My classes</BackLink>
      <AdminHeader
        title={batch.course_title}
        subtitle={`${batch.name} · ${MODE_LABEL[batch.mode] ?? batch.mode} · starts ${formatDate(batch.start_date)}`}
      />

      <ClassTabs batchId={batchId} t={t} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="card overflow-hidden">
            <div className={`h-1.5 ${tile.accent}`} />
            <div className="p-5">
              <p className="text-xs uppercase tracking-[0.12em] text-ink-400">
                {tile.label}
              </p>
              <p className="mt-1 text-3xl font-bold text-ink-900">{tile.value}</p>
            </div>
          </div>
        ))}
      </div>

      <Panel title={t.classes.classDetails}>
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="text-ink-400">{t.classes.schedule}</dt>
            <dd className="font-medium text-ink-800">{batch.schedule_text || "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-400">{t.classes.roomOrLink}</dt>
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
                batch.room_or_link || "—"
              )}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-400">{t.classes.seats}</dt>
            <dd className="font-medium text-ink-800">
              {batch.seats_taken} / {batch.seats_total}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-400">{t.classes.tabs.assignments}</dt>
            <dd className="font-medium text-ink-800">
              {stats.assignments_published} published · {stats.submissions_graded}/
              {stats.submissions_received} graded
            </dd>
          </div>
        </dl>
      </Panel>

      <Panel
        title={t.classes.students}
        description={t.classes.perStudent}
      >
        {students.length === 0 ? (
          <EmptyState>
            No students yet. They appear here once their enrolment is active.
          </EmptyState>
        ) : (
          <TableShell
            head={[t.common.student, t.common.phone, t.classes.attendanceRate, t.classes.present, t.classes.submitted, t.classes.average]}
            minWidth="48rem"
          >
            {students.map((student) => (
              <tr key={student.enrollment_id} className="border-b border-ink-50 last:border-0">
                <td className="px-5 py-3 font-medium text-ink-800">
                  {student.full_name || "(no name)"}
                </td>
                <td className="px-5 py-3 text-ink-600">
                  {student.phone ? (
                    <a
                      href={`tel:${student.phone.replace(/\s/g, "")}`}
                      className="hover:text-brand-700 hover:underline"
                    >
                      {student.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-3">
                  <Rate value={student.attendance_rate} />
                </td>
                <td className="px-5 py-3 text-ink-600">
                  {student.present_count}/{student.sessions_marked}
                </td>
                <td className="px-5 py-3 text-ink-600">{student.submitted_count}</td>
                <td className="px-5 py-3 font-semibold text-ink-800">
                  {student.average_score ?? "—"}
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>

      <div className="flex flex-wrap gap-3">
        <Link href={`/admin/classes/${batchId}/attendance`} className="btn btn-primary">
          Take attendance
        </Link>
        <Link href={`/admin/classes/${batchId}/assignments`} className="btn btn-outline">
          Set an assignment
        </Link>
        <Link href={`/admin/classes/${batchId}/report`} className="btn btn-outline">
          Write a report
        </Link>
      </div>
    </>
  );
}
