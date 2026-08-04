import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/app/actions/admin/guard";
import {
  createBatch,
  deleteBatch,
  deleteCourse,
  updateBatch,
  updateCourse,
} from "@/app/actions/admin/courses";
import {
  AdminHeader,
  BackLink,
  Field,
  FlashMessage,
  Panel,
  Select,
  Checkbox,
} from "@/components/admin/ui";
import { CourseForm } from "@/components/admin/CourseForm";
import { formatDate } from "@/lib/format";
import type { Batch, Course } from "@/lib/types";

const MODE_OPTIONS = [
  { value: "offline", label: "On campus" },
  { value: "online", label: "Live online" },
  { value: "hybrid", label: "Hybrid" },
];

export default async function EditCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string; closed?: string; deleted?: string }>;
}) {
  const { db } = await requireAdmin();
  const { id } = await params;
  const { saved, error, closed, deleted } = await searchParams;

  const { data: course } = await db
    .from("courses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!course) notFound();

  const { data: batches } = await db
    .from("batches")
    .select("*")
    .eq("course_id", id)
    .order("start_date", { ascending: true });

  return (
    <>
      <BackLink href="/admin/courses">All courses</BackLink>
      <AdminHeader
        title={(course as Course).title_en}
        subtitle={`/courses/${(course as Course).slug}`}
        action={
          <Link
            href={`/courses/${(course as Course).slug}`}
            target="_blank"
            className="btn btn-outline"
          >
            View on site
          </Link>
        }
      />

      <FlashMessage
        saved={saved || closed || deleted}
        error={error}
        savedText={
          closed
            ? "That batch has students, so it was closed instead of deleted."
            : deleted
              ? "Batch deleted."
              : "Saved."
        }
        messages={{
          slug_taken: "That web address is already used by another course.",
          batch_fields: "A batch needs a name and a start date.",
        }}
      />

      <CourseForm
        course={course as Course}
        action={updateCourse}
        submitLabel="Save course"
      />

      {/* ---------------- Batches ---------------- */}
      <h2 className="mb-4 mt-12 text-xl font-bold tracking-tight">Batches</h2>
      <p className="mb-5 text-sm text-ink-500">
        One row per intake. Students pick a batch when they enrol, and see its
        schedule and room or Zoom link once their payment clears.
      </p>

      {(batches ?? []).map((batch) => {
        const b = batch as Batch;
        return (
          <Panel key={b.id}>
            <form action={updateBatch}>
              <input type="hidden" name="id" value={b.id} />
              <input type="hidden" name="course_id" value={id} />

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Batch name" name="name" defaultValue={b.name} required />
                <Select
                  label="Mode"
                  name="mode"
                  defaultValue={b.mode}
                  options={MODE_OPTIONS}
                />
                <Field
                  label="Starts"
                  name="start_date"
                  type="date"
                  defaultValue={b.start_date}
                  required
                />
                <Field
                  label="Ends"
                  name="end_date"
                  type="date"
                  defaultValue={b.end_date ?? ""}
                  hint="Optional."
                />
                <Field
                  label="Schedule"
                  name="schedule_text"
                  defaultValue={b.schedule_text}
                  placeholder="Sat / Mon / Wed · 7:00–9:00 PM"
                  className="lg:col-span-2"
                />
                <Field
                  label="Room or meeting link"
                  name="room_or_link"
                  defaultValue={b.room_or_link}
                  hint="Only shown to students whose payment has cleared."
                  className="lg:col-span-2"
                />
                <Field
                  label="Total seats"
                  name="seats_total"
                  type="number"
                  min="1"
                  defaultValue={b.seats_total}
                  hint={`${b.seats_taken} taken so far.`}
                />
              </div>

              <div className="mt-5">
                <Checkbox
                  label="Open for enrolment"
                  name="is_open"
                  defaultChecked={b.is_open}
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="submit" className="btn btn-primary">
                  Save batch
                </button>
              </div>
            </form>

            <form action={deleteBatch} className="mt-3">
              <input type="hidden" name="id" value={b.id} />
              <input type="hidden" name="course_id" value={id} />
              <button
                type="submit"
                className="text-sm font-medium text-coral-600 hover:underline"
              >
                Delete this batch
              </button>
            </form>

            <p className="mt-3 text-xs text-ink-400">
              Created for {formatDate(b.start_date)} · {b.seats_taken}/{b.seats_total}{" "}
              seats used
            </p>
          </Panel>
        );
      })}

      <Panel title="Add a batch">
        <form action={createBatch}>
          <input type="hidden" name="course_id" value={id} />

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Batch name"
              name="name"
              required
              placeholder="Evening Batch — On Campus"
            />
            <Select label="Mode" name="mode" defaultValue="offline" options={MODE_OPTIONS} />
            <Field label="Starts" name="start_date" type="date" required />
            <Field label="Ends" name="end_date" type="date" hint="Optional." />
            <Field
              label="Schedule"
              name="schedule_text"
              placeholder="Sat / Mon / Wed · 7:00–9:00 PM"
              className="lg:col-span-2"
            />
            <Field
              label="Room or meeting link"
              name="room_or_link"
              placeholder="HGLC Campus, Dhaka"
              className="lg:col-span-2"
            />
            <Field label="Total seats" name="seats_total" type="number" min="1" defaultValue={20} />
          </div>

          <div className="mt-5">
            <Checkbox label="Open for enrolment" name="is_open" defaultChecked />
          </div>

          <button type="submit" className="btn btn-primary mt-5">
            Add batch
          </button>
        </form>
      </Panel>

      <Panel title="Danger zone">
        <p className="mb-4 text-sm text-ink-500">
          Deleting removes the course completely. If any student has ever enrolled,
          it is hidden from the site instead so their records stay intact.
        </p>
        <form action={deleteCourse}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="btn btn-accent">
            Delete course
          </button>
        </form>
      </Panel>
    </>
  );
}
