import { notFound } from "next/navigation";
import { loadClass } from "@/lib/classroom";
import {
  deleteAssignment,
  gradeSubmission,
  updateAssignment,
} from "@/app/actions/admin/classroom";
import {
  AdminHeader,
  BackLink,
  Checkbox,
  Field,
  FlashMessage,
  Panel,
  StatusBadge,
  TextArea,
} from "@/components/admin/ui";
import { ClassTabs } from "@/components/admin/ClassTabs";
import { formatDateTime } from "@/lib/format";
import type { Assignment, AssignmentSubmission } from "@/lib/types";

function forInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function AssignmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ batchId: string; assignmentId: string }>;
  searchParams: Promise<{ created?: string; saved?: string; graded?: string }>;
}) {
  const { batchId, assignmentId } = await params;
  const { created, saved, graded } = await searchParams;
  const { db, batch, t } = await loadClass(batchId);

  const { data: raw } = await db
    .from("assignments")
    .select("*")
    .eq("id", assignmentId)
    .eq("batch_id", batchId)
    .maybeSingle();

  if (!raw) notFound();
  const assignment = raw as Assignment;

  const { data: submissionRows } = await db
    .from("assignment_submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .order("submitted_at", { ascending: true });

  const submissions = (submissionRows ?? []) as AssignmentSubmission[];

  // Everyone in the batch, so the not-yet-submitted are visible too.
  const { data: roster } = await db
    .from("enrollments")
    .select("id, user_id")
    .eq("batch_id", batchId)
    .eq("status", "active");

  const userIds = (roster ?? []).map((r) => r.user_id);
  const { data: profiles } = userIds.length
    ? await db.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };

  const nameByUser = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name as string | null]),
  );
  const nameByEnrolment = new Map(
    (roster ?? []).map((r) => [r.id, nameByUser.get(r.user_id) ?? null]),
  );
  const submissionByEnrolment = new Map(submissions.map((s) => [s.enrollment_id, s]));

  const missing = (roster ?? []).filter((r) => !submissionByEnrolment.has(r.id));

  return (
    <>
      <BackLink href={`/admin/classes/${batchId}/assignments`}>All assignments</BackLink>
      <AdminHeader title={assignment.title} subtitle={batch.name} />
      <ClassTabs batchId={batchId} t={t} />

      <FlashMessage
        saved={created || saved || graded}
        savedText={
          created ? "Assignment created." : graded ? "Marked." : "Saved."
        }
      />

      <Panel title="Submissions" description={`${submissions.length} handed in · ${missing.length} outstanding`}>
        {submissions.length === 0 ? (
          <p className="text-sm text-ink-500">Nobody has handed in yet.</p>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="border-t border-ink-100 pt-4 first:border-t-0 first:pt-0"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="font-semibold text-ink-900">
                    {nameByEnrolment.get(submission.enrollment_id) || "(no name)"}
                  </p>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={submission.state} />
                    <span className="text-xs text-ink-400">
                      {formatDateTime(submission.submitted_at)}
                    </span>
                  </div>
                </div>

                {submission.body && (
                  <p className="mt-3 whitespace-pre-wrap rounded-lg bg-paper-dim p-4 text-sm leading-relaxed text-ink-700">
                    {submission.body}
                  </p>
                )}

                {submission.link && (
                  <a
                    href={submission.link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline"
                  >
                    Open attachment ↗
                  </a>
                )}

                <form
                  action={gradeSubmission}
                  className="mt-4 grid gap-4 sm:grid-cols-[8rem_1fr_auto] sm:items-end"
                >
                  <input type="hidden" name="batch_id" value={batchId} />
                  <input type="hidden" name="assignment_id" value={assignmentId} />
                  <input type="hidden" name="submission_id" value={submission.id} />

                  <Field
                    label={`Score / ${assignment.max_score}`}
                    name="score"
                    type="number"
                    step="0.5"
                    min="0"
                    defaultValue={submission.score ?? ""}
                  />
                  <Field
                    label="Feedback"
                    name="feedback"
                    defaultValue={submission.feedback}
                    placeholder="What to fix next time"
                  />
                  <button type="submit" className="btn btn-primary">
                    {submission.state === "graded" ? "Update mark" : "Save mark"}
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        {missing.length > 0 && (
          <div className="mt-6 rounded-lg bg-coral-50 px-4 py-3">
            <p className="text-sm font-semibold text-coral-700">
              Not handed in ({missing.length})
            </p>
            <p className="mt-1 text-sm text-coral-700/90">
              {missing
                .map((r) => nameByEnrolment.get(r.id) || "(no name)")
                .join(", ")}
            </p>
          </div>
        )}
      </Panel>

      <Panel title="Edit assignment">
        <form action={updateAssignment} className="grid gap-5 sm:grid-cols-2">
          <input type="hidden" name="batch_id" value={batchId} />
          <input type="hidden" name="id" value={assignmentId} />

          <Field
            label="Title"
            name="title"
            defaultValue={assignment.title}
            required
            className="sm:col-span-2"
          />
          <TextArea
            label="Instructions"
            name="instructions"
            rows={5}
            defaultValue={assignment.instructions}
            className="sm:col-span-2"
          />
          <Field
            label="Due"
            name="due_at"
            type="datetime-local"
            defaultValue={forInput(assignment.due_at)}
          />
          <Field
            label="Out of"
            name="max_score"
            type="number"
            min="1"
            defaultValue={assignment.max_score}
          />
          <div className="sm:col-span-2">
            <Checkbox
              label="Published"
              name="is_published"
              defaultChecked={assignment.is_published}
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn btn-primary">
              Save assignment
            </button>
          </div>
        </form>

        <form action={deleteAssignment} className="mt-5">
          <input type="hidden" name="batch_id" value={batchId} />
          <input type="hidden" name="id" value={assignmentId} />
          <button
            type="submit"
            className="text-sm font-medium text-coral-600 hover:underline"
          >
            Delete this assignment and its submissions
          </button>
        </form>
      </Panel>
    </>
  );
}
