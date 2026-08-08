import Link from "next/link";
import { loadClass } from "@/lib/classroom";
import {
  createAttendanceSession,
  deleteAttendanceSession,
  saveAttendance,
} from "@/app/actions/admin/classroom";
import {
  AdminHeader,
  BackLink,
  EmptyState,
  Field,
  FlashMessage,
  Panel,
} from "@/components/admin/ui";
import { ClassTabs } from "@/components/admin/ClassTabs";
import { formatDate } from "@/lib/format";
import type { AttendanceState } from "@/lib/types";

const STATES: { value: AttendanceState; label: string; tone: string }[] = [
  { value: "present", label: "Present", tone: "peer-checked:bg-brand-600" },
  { value: "late", label: "Late", tone: "peer-checked:bg-plum-600" },
  { value: "absent", label: "Absent", tone: "peer-checked:bg-coral-500" },
  { value: "excused", label: "Excused", tone: "peer-checked:bg-ink-500" },
];

export default async function AttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<{
    session?: string;
    saved?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  const { batchId } = await params;
  const { session: sessionId, saved, deleted, error } = await searchParams;
  const { db, batch } = await loadClass(batchId);

  const { data: sessions } = await db
    .from("attendance_sessions")
    .select("id, held_on, topic")
    .eq("batch_id", batchId)
    .order("held_on", { ascending: false });

  const list = sessions ?? [];
  const active = sessionId
    ? list.find((s) => s.id === sessionId)
    : list[0];

  const { data: roster } = await db
    .from("enrollments")
    .select("id, user_id")
    .eq("batch_id", batchId)
    .eq("status", "active");

  const studentIds = (roster ?? []).map((r) => r.user_id);
  const { data: profiles } = studentIds.length
    ? await db.from("profiles").select("id, full_name").in("id", studentIds)
    : { data: [] };

  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name as string | null]),
  );

  const { data: records } = active
    ? await db
        .from("attendance_records")
        .select("enrollment_id, state")
        .eq("session_id", active.id)
    : { data: [] };

  const stateByEnrolment = new Map(
    (records ?? []).map((r) => [r.enrollment_id, r.state as AttendanceState]),
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <BackLink href={`/admin/classes/${batchId}`}>{batch.course_title}</BackLink>
      <AdminHeader title="Attendance" subtitle={batch.name} />
      <ClassTabs batchId={batchId} />

      <FlashMessage
        saved={saved || deleted}
        error={error}
        savedText={deleted ? "Register deleted." : "Attendance saved."}
        messages={{
          session_exists: "A register already exists for that date — open it below.",
          failed: "Something went wrong. Please try again.",
        }}
      />

      <Panel title="Start a register">
        <form action={createAttendanceSession} className="grid gap-5 sm:grid-cols-3">
          <input type="hidden" name="batch_id" value={batchId} />
          <Field label="Date" name="held_on" type="date" defaultValue={today} required />
          <Field
            label="Topic"
            name="topic"
            placeholder="Chapter 4 — past tense"
            className="sm:col-span-2"
          />
          <div className="sm:col-span-3">
            <button type="submit" className="btn btn-primary">
              Open register
            </button>
            <p className="mt-2 text-xs text-ink-400">
              Everyone starts marked present — change only the students who were not.
            </p>
          </div>
        </form>
      </Panel>

      {list.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {list.slice(0, 14).map((s) => {
            const selected = active?.id === s.id;
            return (
              <Link
                key={s.id}
                href={`/admin/classes/${batchId}/attendance?session=${s.id}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  selected
                    ? "border-ink-900 bg-ink-900 text-white"
                    : "border-ink-200 bg-white text-ink-600 hover:border-ink-300"
                }`}
              >
                {formatDate(s.held_on)}
              </Link>
            );
          })}
        </div>
      )}

      {!active ? (
        <EmptyState>No registers yet. Open one above to mark today&rsquo;s class.</EmptyState>
      ) : (roster ?? []).length === 0 ? (
        <EmptyState>No active students in this batch yet.</EmptyState>
      ) : (
        <Panel
          title={formatDate(active.held_on)}
          description={active.topic || "Mark each student, then save."}
        >
          <form action={saveAttendance}>
            <input type="hidden" name="batch_id" value={batchId} />
            <input type="hidden" name="session_id" value={active.id} />

            <ul className="divide-y divide-ink-100">
              {(roster ?? []).map((entry) => {
                const current = stateByEnrolment.get(entry.id) ?? "present";
                return (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <span className="font-medium text-ink-800">
                      {nameById.get(entry.user_id) || "(no name)"}
                    </span>

                    <div className="flex gap-1">
                      {STATES.map((state) => (
                        <label key={state.value} className="cursor-pointer">
                          <input
                            type="radio"
                            name={`state:${entry.id}`}
                            value={state.value}
                            defaultChecked={current === state.value}
                            className="peer sr-only"
                          />
                          <span
                            className={`block rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 transition-colors peer-checked:border-transparent peer-checked:text-white ${state.tone}`}
                          >
                            {state.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>

            <button type="submit" className="btn btn-primary mt-6">
              Save attendance
            </button>
          </form>

          <form action={deleteAttendanceSession} className="mt-4">
            <input type="hidden" name="batch_id" value={batchId} />
            <input type="hidden" name="session_id" value={active.id} />
            <button
              type="submit"
              className="text-sm font-medium text-coral-600 hover:underline"
            >
              Delete this register
            </button>
          </form>
        </Panel>
      )}
    </>
  );
}
