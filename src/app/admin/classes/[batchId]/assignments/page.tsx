import Link from "next/link";
import { loadClass } from "@/lib/classroom";
import { createAssignment } from "@/app/actions/admin/classroom";
import {
  AdminHeader,
  BackLink,
  Checkbox,
  EmptyState,
  Field,
  FlashMessage,
  Panel,
  TextArea,
} from "@/components/admin/ui";
import { ClassTabs } from "@/components/admin/ClassTabs";
import { DateTimeField } from "@/components/admin/DateTimeField";
import { LocalTime } from "@/components/LocalTime";
import type { Assignment } from "@/lib/types";

export default async function AssignmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<{ deleted?: string; error?: string }>;
}) {
  const { batchId } = await params;
  const { deleted, error } = await searchParams;
  const { db, batch, t } = await loadClass(batchId);

  const { data } = await db
    .from("assignments")
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: false });

  const assignments = (data ?? []) as Assignment[];

  // How many have handed in, per assignment.
  const ids = assignments.map((a) => a.id);
  const { data: submissions } = ids.length
    ? await db
        .from("assignment_submissions")
        .select("assignment_id, state")
        .in("assignment_id", ids)
    : { data: [] };

  const counts = new Map<string, { total: number; graded: number }>();
  for (const row of submissions ?? []) {
    const entry = counts.get(row.assignment_id) ?? { total: 0, graded: 0 };
    entry.total += 1;
    if (row.state === "graded") entry.graded += 1;
    counts.set(row.assignment_id, entry);
  }

  return (
    <>
      <BackLink href={`/admin/classes/${batchId}`}>{batch.course_title}</BackLink>
      <AdminHeader title={t.assignments.title} subtitle={batch.name} />
      <ClassTabs batchId={batchId} t={t} />

      <FlashMessage
        saved={deleted}
        error={error}
        savedText="Assignment deleted."
        messages={{
          title: "Give the assignment a title.",
          failed: "Something went wrong. Please try again.",
        }}
      />

      {assignments.length === 0 ? (
        <EmptyState>{t.assignments.none}</EmptyState>
      ) : (
        <div className="mb-6 space-y-3">
          {assignments.map((assignment) => {
            const count = counts.get(assignment.id) ?? { total: 0, graded: 0 };
            const overdue =
              assignment.due_at && new Date(assignment.due_at).getTime() < Date.now();

            return (
              <Link
                key={assignment.id}
                href={`/admin/classes/${batchId}/assignments/${assignment.id}`}
                className="card block p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-ink-900">{assignment.title}</h3>
                      <span
                        className={`badge ${
                          assignment.is_published
                            ? "bg-brand-50 text-brand-700"
                            : "bg-ink-100 text-ink-500"
                        }`}
                      >
                        {assignment.is_published ? t.assignments.published : t.assignments.draft}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-400">
                      {assignment.due_at
                        ? null
                        : "No due date"}
                      {assignment.due_at && (
                        <>
                          Due <LocalTime iso={assignment.due_at} />
                          {overdue ? " · closed" : ""}
                        </>
                      )}{" "}
                      · out of {assignment.max_score}
                    </p>
                  </div>

                  <div className="text-right text-sm">
                    <p className="font-semibold text-ink-900">
                      {count.graded}/{count.total}
                    </p>
                    <p className="text-xs text-ink-400">graded</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Panel
        title={t.assignments.setTitle}
        description={t.assignments.setSub}
      >
        <form action={createAssignment} className="grid gap-5 sm:grid-cols-2">
          <input type="hidden" name="batch_id" value={batchId} />

          <Field
            label={t.assignments.fieldTitle}
            name="title"
            required
            placeholder="Writing task 3 — describe your week"
            className="sm:col-span-2"
          />
          <TextArea
            label={t.assignments.instructions}
            name="instructions"
            rows={5}
            placeholder="Write 150–200 words. Use at least five past-tense verbs."
            className="sm:col-span-2"
          />
          <DateTimeField label={t.assignments.dueLabel} name="due_at" />
          <Field
            label={t.assignments.maxScore}
            name="max_score"
            type="number"
            min="1"
            defaultValue={100}
          />
          <div className="sm:col-span-2">
            <Checkbox
              label={t.assignments.publishNow}
              name="is_published"
              defaultChecked
              hint="Leave off to save it as a draft students cannot see."
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn btn-primary">
              {t.assignments.create}
            </button>
          </div>
        </form>
      </Panel>
    </>
  );
}
