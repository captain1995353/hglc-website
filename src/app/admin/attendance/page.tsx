import Link from "next/link";
import { requireRole } from "@/app/actions/admin/guard";
import { AdminHeader, EmptyState, Panel, TableShell } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";
import type { BatchStats } from "@/lib/types";
import { EMPTY_STATS } from "@/lib/classroom";

/**
 * Attendance across every batch, for the admin.
 *
 * Teachers get /admin/classes, which shows the batches they personally
 * teach. An admin has no "my" classes — they need the whole centre at once,
 * which is a different question and so a different page.
 */
export default async function AttendanceOverviewPage() {
  const { db, t } = await requireRole(["admin"]);

  const { data: batchRows } = await db
    .from("batches")
    .select(
      "id, name, mode, start_date, seats_total, seats_taken, teacher_id, course:courses (title_en)",
    )
    .order("start_date", { ascending: false });

  const batches = batchRows ?? [];

  const teacherIds = [
    ...new Set(batches.map((b) => b.teacher_id).filter(Boolean) as string[]),
  ];
  const { data: teachers } = teacherIds.length
    ? await db.from("profiles").select("id, full_name").in("id", teacherIds)
    : { data: [] };
  const teacherById = new Map((teachers ?? []).map((p) => [p.id, p.full_name]));

  // One call per batch, run together. A language centre has tens of batches,
  // not thousands, and reusing the tested function beats hand-rolling the
  // same aggregation a second time.
  const stats = await Promise.all(
    batches.map(async (batch) => {
      const { data } = await db.rpc("batch_stats", { batch: batch.id });
      return { ...EMPTY_STATS, ...((data as BatchStats) ?? {}) };
    }),
  );

  const rows = batches.map((batch, index) => {
    const course = (Array.isArray(batch.course) ? batch.course[0] : batch.course) as
      | { title_en: string }
      | undefined;

    return {
      id: batch.id,
      courseTitle: course?.title_en ?? "Course",
      name: batch.name,
      startDate: batch.start_date,
      teacher: batch.teacher_id ? teacherById.get(batch.teacher_id) : null,
      stats: stats[index],
    };
  });

  const marked = rows.filter((r) => r.stats.attendance_rate !== null);
  const centreRate =
    marked.length === 0
      ? null
      : Math.round(
          (marked.reduce((sum, r) => sum + Number(r.stats.attendance_rate), 0) /
            marked.length) *
            10,
        ) / 10;

  return (
    <>
      <AdminHeader
        title={t.attendanceAdmin.title}
        subtitle={t.attendanceAdmin.subtitle}
      />

      {rows.length === 0 ? (
        <EmptyState>{t.attendanceAdmin.noBatches}</EmptyState>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Tile
              label={t.attendanceAdmin.batchesRunning}
              value={String(rows.length)}
              accent="bg-ink-800"
            />
            <Tile
              label={t.attendanceAdmin.classesHeld}
              value={String(
                rows.reduce((sum, r) => sum + Number(r.stats.sessions_held), 0),
              )}
              accent="bg-brand-600"
            />
            <Tile
              label={t.attendanceAdmin.centreRate}
              value={centreRate === null ? "—" : `${centreRate}%`}
              accent="bg-coral-500"
            />
          </div>

          <Panel title={t.attendanceAdmin.byBatch} description={t.attendanceAdmin.byBatchSub}>
            <TableShell
              head={[
                t.attendanceAdmin.batch,
                t.attendanceAdmin.teacher,
                t.classes.students,
                t.classes.classesHeld,
                t.classes.attendanceRate,
                "",
              ]}
              minWidth="52rem"
            >
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/attendance/${row.id}`}
                      className="font-semibold text-ink-800 hover:text-brand-700"
                    >
                      {row.courseTitle}
                    </Link>
                    <p className="text-xs text-ink-400">
                      {row.name} · {formatDate(row.startDate)}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-ink-600">
                    {row.teacher || (
                      <span className="text-ink-400">{t.attendanceAdmin.unassigned}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-ink-600">
                    {row.stats.active_students}
                  </td>
                  <td className="px-5 py-3 text-ink-600">{row.stats.sessions_held}</td>
                  <td className="px-5 py-3">
                    <Rate value={row.stats.attendance_rate} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/attendance/${row.id}`}
                      className="text-sm font-medium text-brand-700 hover:underline"
                    >
                      {t.attendanceAdmin.view}
                    </Link>
                  </td>
                </tr>
              ))}
            </TableShell>
          </Panel>
        </>
      )}
    </>
  );
}

function Tile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="card overflow-hidden">
      <div className={`h-1.5 ${accent}`} />
      <div className="p-5">
        <p className="text-xs uppercase tracking-[0.12em] text-ink-400">{label}</p>
        <p className="mt-1 text-3xl font-bold text-ink-900">{value}</p>
      </div>
    </div>
  );
}

/** Colour carries emphasis, never the number itself — the figure is text. */
function Rate({ value }: { value: number | null }) {
  if (value === null) return <span className="text-ink-400">—</span>;
  const tone =
    value >= 85 ? "text-brand-700" : value >= 65 ? "text-ink-800" : "text-coral-600";
  return <span className={`font-semibold ${tone}`}>{value}%</span>;
}
