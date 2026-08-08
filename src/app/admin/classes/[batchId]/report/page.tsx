import { loadBatchStats, loadClass, loadStudentStats } from "@/lib/classroom";
import { createReport, deleteReport } from "@/app/actions/admin/classroom";
import {
  AdminHeader,
  BackLink,
  Field,
  FlashMessage,
  Panel,
  TableShell,
} from "@/components/admin/ui";
import { ClassTabs } from "@/components/admin/ClassTabs";
import { formatDate, formatDateTime } from "@/lib/format";
import type { BatchReport, BatchStats } from "@/lib/types";

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink-100 py-2 last:border-0">
      <span className="text-sm text-ink-500">{label}</span>
      <span className="font-semibold text-ink-900">{value}</span>
    </div>
  );
}

function describe(stats: BatchStats) {
  return [
    { label: "Active students", value: String(stats.active_students) },
    { label: "Classes held", value: String(stats.sessions_held) },
    {
      label: "Attendance rate",
      value: stats.attendance_rate === null ? "—" : `${stats.attendance_rate}%`,
    },
    { label: "Assignments published", value: String(stats.assignments_published) },
    {
      label: "Submissions",
      value: `${stats.submissions_graded} graded of ${stats.submissions_received}`,
    },
    {
      label: "Average score",
      value: stats.average_score === null ? "—" : String(stats.average_score),
    },
  ];
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<{ created?: string; deleted?: string; error?: string }>;
}) {
  const { batchId } = await params;
  const { created, deleted, error } = await searchParams;
  const { db, batch } = await loadClass(batchId);

  const [stats, students] = await Promise.all([
    loadBatchStats(db, batchId),
    loadStudentStats(db, batchId),
  ]);

  const { data: reportRows } = await db
    .from("batch_reports")
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: false });

  const reports = (reportRows ?? []) as BatchReport[];

  const today = new Date().toISOString().slice(0, 10);
  const struggling = students.filter(
    (s) => s.attendance_rate !== null && s.attendance_rate < 70,
  );

  return (
    <>
      <BackLink href={`/admin/classes/${batchId}`}>{batch.course_title}</BackLink>
      <AdminHeader title="Batch report" subtitle={batch.name} />
      <ClassTabs batchId={batchId} />

      <FlashMessage
        saved={created || deleted}
        error={error}
        savedText={created ? "Report saved." : "Report deleted."}
        messages={{ title: "Give the report a title." }}
      />

      <Panel
        title="Where the batch stands today"
        description="These numbers are saved with each report, so an old report keeps the figures it was written with."
      >
        <div className="grid gap-x-10 sm:grid-cols-2">
          {describe(stats).map((line) => (
            <StatLine key={line.label} label={line.label} value={line.value} />
          ))}
        </div>

        {struggling.length > 0 && (
          <div className="mt-5 rounded-lg bg-coral-50 px-4 py-3">
            <p className="text-sm font-semibold text-coral-700">
              Attendance below 70%
            </p>
            <p className="mt-1 text-sm text-coral-700/90">
              {struggling
                .map((s) => `${s.full_name || "(no name)"} (${s.attendance_rate}%)`)
                .join(", ")}
            </p>
          </div>
        )}
      </Panel>

      <Panel title="Per student">
        {students.length === 0 ? (
          <p className="text-sm text-ink-500">No students yet.</p>
        ) : (
          <TableShell
            head={["Student", "Attendance", "Submitted", "Average"]}
            minWidth="34rem"
          >
            {students.map((student) => (
              <tr key={student.enrollment_id} className="border-b border-ink-50 last:border-0">
                <td className="px-5 py-3 font-medium text-ink-800">
                  {student.full_name || "(no name)"}
                </td>
                <td className="px-5 py-3 text-ink-600">
                  {student.attendance_rate === null
                    ? "—"
                    : `${student.attendance_rate}% (${student.present_count}/${student.sessions_marked})`}
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

      <Panel title="Write a report">
        <form action={createReport} className="grid gap-5 sm:grid-cols-2">
          <input type="hidden" name="batch_id" value={batchId} />
          <Field
            label="Title"
            name="title"
            required
            placeholder="Week 6 progress report"
            className="sm:col-span-2"
          />
          <Field label="Period from" name="period_start" type="date" />
          <Field
            label="Period to"
            name="period_end"
            type="date"
            defaultValue={today}
          />
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="summary">
              Summary
            </label>
            <textarea
              id="summary"
              name="summary"
              rows={7}
              placeholder="How the batch is progressing, who needs attention, what comes next."
              className="field-input resize-y"
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn btn-primary">
              Save report
            </button>
          </div>
        </form>
      </Panel>

      {reports.length > 0 && (
        <>
          <h2 className="mb-4 mt-10 text-xl font-bold tracking-tight">
            Previous reports
          </h2>
          {reports.map((report) => {
            const snapshot = report.stats as Partial<BatchStats>;
            return (
              <Panel key={report.id} title={report.title}>
                <p className="mb-3 text-xs text-ink-400">
                  {report.period_start ? formatDate(report.period_start) : "—"} to{" "}
                  {report.period_end ? formatDate(report.period_end) : "—"} · written{" "}
                  {formatDateTime(report.created_at)}
                </p>

                {report.summary && (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                    {report.summary}
                  </p>
                )}

                <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-500">
                  <div>
                    Attendance:{" "}
                    <strong className="text-ink-800">
                      {snapshot.attendance_rate ?? "—"}%
                    </strong>
                  </div>
                  <div>
                    Classes:{" "}
                    <strong className="text-ink-800">
                      {snapshot.sessions_held ?? 0}
                    </strong>
                  </div>
                  <div>
                    Average:{" "}
                    <strong className="text-ink-800">
                      {snapshot.average_score ?? "—"}
                    </strong>
                  </div>
                </dl>

                <form action={deleteReport} className="mt-4">
                  <input type="hidden" name="batch_id" value={batchId} />
                  <input type="hidden" name="id" value={report.id} />
                  <button
                    type="submit"
                    className="text-sm font-medium text-coral-600 hover:underline"
                  >
                    Delete report
                  </button>
                </form>
              </Panel>
            );
          })}
        </>
      )}
    </>
  );
}
