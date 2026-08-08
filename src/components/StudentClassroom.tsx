import { createAdminClient } from "@/lib/supabase/admin";
import { submitAssignment } from "@/app/actions/submit-assignment";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Assignment, AssignmentSubmission, AttendanceState } from "@/lib/types";

const ATTENDANCE_TONE: Record<AttendanceState, string> = {
  present: "bg-brand-50 text-brand-700",
  late: "bg-plum-50 text-plum-700",
  absent: "bg-coral-50 text-coral-700",
  excused: "bg-ink-100 text-ink-600",
};

/**
 * Everything a student sees about the classes they are actually in:
 * assignments to hand in, marks and feedback once given, their own attendance,
 * and any group the teacher put them in.
 *
 * Reads through the service-role client because the data spans several tables
 * — every query is filtered to this student's own enrolments.
 */
export async function StudentClassroom({
  enrollmentIds,
  batchIds,
}: {
  enrollmentIds: string[];
  batchIds: string[];
}) {
  if (enrollmentIds.length === 0 || batchIds.length === 0) return null;

  const db = createAdminClient();

  const [{ data: assignmentRows }, { data: submissionRows }, { data: groupRows }] =
    await Promise.all([
      db
        .from("assignments")
        .select("*")
        .in("batch_id", batchIds)
        .eq("is_published", true)
        .order("due_at", { ascending: true, nullsFirst: false }),
      db
        .from("assignment_submissions")
        .select("*")
        .in("enrollment_id", enrollmentIds),
      db
        .from("class_group_members")
        .select("enrollment_id, group:class_groups (id, name, note)")
        .in("enrollment_id", enrollmentIds),
    ]);

  const assignments = (assignmentRows ?? []) as Assignment[];
  const submissions = (submissionRows ?? []) as AssignmentSubmission[];
  const byAssignment = new Map(submissions.map((s) => [s.assignment_id, s]));

  // Attendance: this student's own marks, newest first.
  const { data: attendanceRows } = await db
    .from("attendance_records")
    .select("state, session:attendance_sessions (held_on, topic)")
    .in("enrollment_id", enrollmentIds)
    .limit(40);

  const attendance = (attendanceRows ?? [])
    .map((row) => {
      const session = (
        Array.isArray(row.session) ? row.session[0] : row.session
      ) as { held_on: string; topic: string } | null;
      return session
        ? { state: row.state as AttendanceState, ...session }
        : null;
    })
    .filter((row): row is { state: AttendanceState; held_on: string; topic: string } =>
      Boolean(row),
    )
    .sort((a, b) => b.held_on.localeCompare(a.held_on));

  const present = attendance.filter(
    (a) => a.state === "present" || a.state === "late",
  ).length;
  const rate = attendance.length
    ? Math.round((present / attendance.length) * 100)
    : null;

  const groups = (groupRows ?? [])
    .map((row) => {
      const group = (Array.isArray(row.group) ? row.group[0] : row.group) as
        | { id: string; name: string; note: string }
        | null;
      return group;
    })
    .filter((g): g is { id: string; name: string; note: string } => Boolean(g));

  if (assignments.length === 0 && attendance.length === 0 && groups.length === 0) {
    return null;
  }

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold tracking-tight">Classroom</h2>

      {groups.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {groups.map((group) => (
            <span key={group.id} className="badge bg-plum-50 text-plum-700">
              {group.name}
              {group.note ? ` · ${group.note}` : ""}
            </span>
          ))}
        </div>
      )}

      {/* ---------------- Assignments ---------------- */}
      {assignments.length > 0 && (
        <>
          <h3 className="mt-6 text-base font-bold text-ink-900">Assignments</h3>
          <div className="mt-3 space-y-4">
            {assignments.map((assignment) => {
              const submission = byAssignment.get(assignment.id);
              const graded = submission?.state === "graded";
              const overdue =
                assignment.due_at &&
                new Date(assignment.due_at).getTime() < Date.now() &&
                !submission;

              return (
                <article key={assignment.id} id={`a-${assignment.id}`} className="card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-ink-900">{assignment.title}</h4>
                      <p className="mt-1 text-xs text-ink-400">
                        {assignment.due_at
                          ? `Due ${formatDateTime(assignment.due_at)}`
                          : "No due date"}{" "}
                        · out of {assignment.max_score}
                      </p>
                    </div>
                    <span
                      className={`badge ${
                        graded
                          ? "bg-brand-50 text-brand-700"
                          : submission
                            ? "bg-plum-50 text-plum-700"
                            : overdue
                              ? "bg-coral-50 text-coral-700"
                              : "bg-ink-100 text-ink-500"
                      }`}
                    >
                      {graded
                        ? `Marked · ${submission?.score}/${assignment.max_score}`
                        : submission
                          ? "Handed in"
                          : overdue
                            ? "Overdue"
                            : "Not handed in"}
                    </span>
                  </div>

                  {assignment.instructions && (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-600">
                      {assignment.instructions}
                    </p>
                  )}

                  {graded ? (
                    <div className="mt-4 rounded-lg bg-brand-50 px-4 py-3">
                      <p className="text-sm font-semibold text-brand-800">
                        Score: {submission?.score} / {assignment.max_score}
                      </p>
                      {submission?.feedback && (
                        <p className="mt-1 text-sm text-brand-800/90">
                          {submission.feedback}
                        </p>
                      )}
                    </div>
                  ) : (
                    <form action={submitAssignment} className="mt-4 space-y-3">
                      <input type="hidden" name="assignment_id" value={assignment.id} />

                      <div>
                        <label
                          className="field-label"
                          htmlFor={`body-${assignment.id}`}
                        >
                          Your answer
                        </label>
                        <textarea
                          id={`body-${assignment.id}`}
                          name="body"
                          rows={5}
                          defaultValue={submission?.body ?? ""}
                          className="field-input resize-y"
                          placeholder="Type your work here."
                        />
                      </div>

                      <div>
                        <label
                          className="field-label"
                          htmlFor={`link-${assignment.id}`}
                        >
                          Or a link
                        </label>
                        <input
                          id={`link-${assignment.id}`}
                          name="link"
                          type="url"
                          defaultValue={submission?.link ?? ""}
                          className="field-input"
                          placeholder="https://docs.google.com/…"
                        />
                      </div>

                      <button type="submit" className="btn btn-primary">
                        {submission ? "Update my work" : "Hand in"}
                      </button>

                      {submission && (
                        <p className="text-xs text-ink-400">
                          Handed in {formatDateTime(submission.submitted_at)}. You can
                          revise it until it is marked.
                        </p>
                      )}
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* ---------------- Attendance ---------------- */}
      {attendance.length > 0 && (
        <>
          <h3 className="mt-8 text-base font-bold text-ink-900">
            My attendance{" "}
            {rate !== null && (
              <span className="ml-1 text-sm font-medium text-ink-500">{rate}%</span>
            )}
          </h3>
          <div className="card mt-3 overflow-x-auto">
            <table className="w-full min-w-[26rem] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Topic</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.slice(0, 20).map((row) => (
                  <tr
                    key={`${row.held_on}-${row.state}`}
                    className="border-b border-ink-50 last:border-0"
                  >
                    <td className="px-5 py-3 text-ink-600">{formatDate(row.held_on)}</td>
                    <td className="px-5 py-3 text-ink-600">{row.topic || "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${ATTENDANCE_TONE[row.state]}`}>
                        {row.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
