import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/app/actions/admin/guard";
import {
  AdminHeader,
  BackLink,
  EmptyState,
  Panel,
  TableShell,
} from "@/components/admin/ui";
import { EMPTY_STATS } from "@/lib/classroom";
import { formatDate } from "@/lib/format";
import type { BatchStats, BatchStudentStat } from "@/lib/types";

type State = "present" | "absent" | "late" | "excused";

/**
 * Each state gets a letter as well as a colour. Colour alone would leave the
 * grid unreadable to a colourblind reader and useless in print.
 */
const MARK: Record<State, { letter: string; className: string; label: string }> = {
  present: { letter: "P", className: "bg-brand-100 text-brand-700", label: "Present" },
  late: { letter: "L", className: "bg-amber-100 text-amber-700", label: "Late" },
  excused: { letter: "E", className: "bg-ink-100 text-ink-600", label: "Excused" },
  absent: { letter: "A", className: "bg-coral-100 text-coral-700", label: "Absent" },
};

/** Beyond this the grid stops being readable; the totals still cover the rest. */
const MAX_SESSIONS = 12;

export default async function BatchAttendancePage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const { db, t } = await requireRole(["admin"]);

  const { data: batch } = await db
    .from("batches")
    .select("id, name, mode, start_date, teacher_id, course:courses (title_en)")
    .eq("id", batchId)
    .maybeSingle();

  if (!batch) redirect("/admin/attendance");

  const course = (Array.isArray(batch.course) ? batch.course[0] : batch.course) as
    | { title_en: string }
    | undefined;

  const [{ data: statsRaw }, { data: studentRows }, { data: sessionRows }] =
    await Promise.all([
      db.rpc("batch_stats", { batch: batchId }),
      db.rpc("batch_student_stats", { batch: batchId }),
      db
        .from("attendance_sessions")
        .select("id, held_on, topic")
        .eq("batch_id", batchId)
        .order("held_on", { ascending: false })
        .limit(MAX_SESSIONS),
    ]);

  const stats: BatchStats = { ...EMPTY_STATS, ...((statsRaw as BatchStats) ?? {}) };
  const students = (studentRows ?? []) as BatchStudentStat[];

  // Oldest first reads better left-to-right, but we asked the database for
  // the newest so that a long-running batch shows its recent classes.
  const sessions = [...(sessionRows ?? [])].reverse();

  const { data: records } = sessions.length
    ? await db
        .from("attendance_records")
        .select("session_id, enrollment_id, state")
        .in(
          "session_id",
          sessions.map((s) => s.id),
        )
    : { data: [] };

  const stateByCell = new Map<string, State>();
  for (const row of records ?? []) {
    stateByCell.set(`${row.session_id}:${row.enrollment_id}`, row.state as State);
  }

  const teacherName = batch.teacher_id
    ? (
        await db
          .from("profiles")
          .select("full_name")
          .eq("id", batch.teacher_id)
          .maybeSingle()
      ).data?.full_name
    : null;

  return (
    <>
      <BackLink href="/admin/attendance">{t.attendanceAdmin.title}</BackLink>
      <AdminHeader
        title={course?.title_en ?? "Course"}
        subtitle={`${batch.name} · ${formatDate(batch.start_date)}${
          teacherName ? ` · ${teacherName}` : ""
        }`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Tile
          label={t.classes.students}
          value={String(stats.active_students)}
          accent="bg-ink-800"
        />
        <Tile
          label={t.classes.classesHeld}
          value={String(stats.sessions_held)}
          accent="bg-brand-600"
        />
        <Tile
          label={t.classes.attendanceRate}
          value={stats.attendance_rate === null ? "—" : `${stats.attendance_rate}%`}
          accent="bg-coral-500"
        />
      </div>

      <Panel title={t.attendanceAdmin.perStudent}>
        {students.length === 0 ? (
          <EmptyState>{t.attendanceAdmin.noStudents}</EmptyState>
        ) : (
          <TableShell
            head={[
              t.common.student,
              t.common.phone,
              t.classes.attendanceRate,
              t.classes.present,
            ]}
            minWidth="38rem"
          >
            {students.map((student) => (
              <tr
                key={student.enrollment_id}
                className="border-b border-ink-50 last:border-0"
              >
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
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>

      <Panel
        title={t.attendanceAdmin.sessionGrid}
        description={
          stats.sessions_held > MAX_SESSIONS
            ? `${t.attendanceAdmin.showingRecent} — ${MAX_SESSIONS} / ${stats.sessions_held}`
            : t.attendanceAdmin.sessionGridSub
        }
      >
        {sessions.length === 0 || students.length === 0 ? (
          <EmptyState>{t.attendanceAdmin.noSessions}</EmptyState>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-3">
              {(Object.keys(MARK) as State[]).map((state) => (
                <span key={state} className="flex items-center gap-1.5 text-xs">
                  <span
                    className={`grid h-5 w-5 place-items-center rounded font-bold ${MARK[state].className}`}
                  >
                    {MARK[state].letter}
                  </span>
                  <span className="text-ink-500">{MARK[state].label}</span>
                </span>
              ))}
            </div>

            {/* Wide by nature — it scrolls inside its own box rather than
                pushing the page sideways. */}
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                      {t.common.student}
                    </th>
                    {sessions.map((session) => (
                      <th
                        key={session.id}
                        title={session.topic || undefined}
                        className="px-2 py-2 text-center text-xs font-semibold text-ink-500"
                      >
                        {new Date(session.held_on).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student.enrollment_id}
                      className="border-t border-ink-50"
                    >
                      <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-2 font-medium text-ink-800">
                        {student.full_name || "(no name)"}
                      </td>
                      {sessions.map((session) => {
                        const state = stateByCell.get(
                          `${session.id}:${student.enrollment_id}`,
                        );
                        return (
                          <td key={session.id} className="px-2 py-2 text-center">
                            {state ? (
                              <span
                                title={MARK[state].label}
                                className={`inline-grid h-6 w-6 place-items-center rounded font-bold ${MARK[state].className}`}
                              >
                                {MARK[state].letter}
                              </span>
                            ) : (
                              <span className="text-ink-300">·</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      {/* The admin no longer has "My classes" in the sidebar, so the class
          screens would be unreachable without these. Read-only oversight is
          the point of this page; occasionally you still need to correct a
          register or read a teacher's written report. */}
      <div className="flex flex-wrap gap-3">
        <Link href={`/admin/classes/${batchId}`} className="btn btn-outline">
          {t.classes.openClass}
        </Link>
        <Link
          href={`/admin/classes/${batchId}/attendance`}
          className="btn btn-outline"
        >
          {t.classes.takeAttendance}
        </Link>
        <Link href={`/admin/classes/${batchId}/report`} className="btn btn-outline">
          {t.report.title}
        </Link>
      </div>
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

function Rate({ value }: { value: number | null }) {
  if (value === null) return <span className="text-ink-400">—</span>;
  const tone =
    value >= 85 ? "text-brand-700" : value >= 65 ? "text-ink-800" : "text-coral-600";
  return <span className={`font-semibold ${tone}`}>{value}%</span>;
}
