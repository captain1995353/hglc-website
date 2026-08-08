import { requireAdmin } from "@/app/actions/admin/guard";
import {
  closeAdmissionWindow,
  createAdmissionWindow,
  deleteAdmissionWindow,
  updateAdmissionWindow,
} from "@/app/actions/admin/admissions";
import {
  AdminHeader,
  Checkbox,
  EmptyState,
  Field,
  FlashMessage,
  Panel,
  TextArea,
} from "@/components/admin/ui";
import { DateTimeField } from "@/components/admin/DateTimeField";
import { LocalTime } from "@/components/LocalTime";
import type { AdmissionWindow } from "@/lib/types";

export default async function AdmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    saved?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  const { db } = await requireAdmin();
  const { created, saved, deleted, error } = await searchParams;

  const { data } = await db
    .from("admission_windows")
    .select("*")
    .order("opens_at", { ascending: false });

  const windows = (data ?? []) as AdmissionWindow[];
  const now = Date.now();

  const live = windows.find(
    (w) =>
      w.is_active &&
      new Date(w.opens_at).getTime() <= now &&
      new Date(w.closes_at).getTime() >= now,
  );

  return (
    <>
      <AdminHeader
        title="Admissions"
        subtitle="Students can only enrol while an admission window is open."
      />

      <FlashMessage
        saved={created || saved || deleted}
        error={error}
        savedText={
          created ? "Admission window created." : deleted ? "Window deleted." : "Saved."
        }
        messages={{
          fields: "A title and a closing date are required.",
          order: "The closing date has to come after the opening date.",
          failed: "Something went wrong. Please try again.",
        }}
      />

      <div
        className={`card mb-6 overflow-hidden ${live ? "" : "border-coral-200"}`}
      >
        <div className={`h-1.5 ${live ? "bg-brand-600" : "bg-coral-500"}`} />
        <div className="p-6">
          <p className="text-xs uppercase tracking-[0.12em] text-ink-400">
            Right now
          </p>
          <p className="mt-1 text-2xl font-bold text-ink-900">
            {live ? "Admissions open" : "Admissions closed"}
          </p>
          <p className="mt-1 text-sm text-ink-500">
            {live ? (
              <>
                {live.title} — closes <LocalTime iso={live.closes_at} />
              </>
            ) : (
              "The catalogue shows courses, but the enrol button is disabled."
            )}
          </p>
        </div>
      </div>

      {windows.length === 0 ? (
        <EmptyState>
          No admission windows yet. Open one below to start accepting students.
        </EmptyState>
      ) : (
        windows.map((window) => {
          const opens = new Date(window.opens_at).getTime();
          const closes = new Date(window.closes_at).getTime();
          const state = !window.is_active
            ? "Closed by hand"
            : closes < now
              ? "Finished"
              : opens > now
                ? "Scheduled"
                : "Open now";

          return (
            <Panel key={window.id}>
              <form action={updateAdmissionWindow}>
                <input type="hidden" name="id" value={window.id} />

                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <span
                    className={`badge ${
                      state === "Open now"
                        ? "bg-brand-50 text-brand-700"
                        : state === "Scheduled"
                          ? "bg-plum-50 text-plum-700"
                          : "bg-ink-100 text-ink-500"
                    }`}
                  >
                    {state}
                  </span>
                  <span className="text-xs text-ink-400">
                    Opened <LocalTime iso={window.opens_at} />
                  </span>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Title"
                    name="title"
                    defaultValue={window.title}
                    required
                  />
                  <DateTimeField
                    label="Closes"
                    name="closes_at"
                    defaultValue={window.closes_at}
                    required
                  />
                  <TextArea
                    label="Note shown to students"
                    name="note"
                    rows={2}
                    defaultValue={window.note}
                    className="sm:col-span-2"
                  />
                </div>

                <div className="mt-4">
                  <Checkbox
                    label="Active"
                    name="is_active"
                    defaultChecked={window.is_active}
                    hint="Turn off to stop accepting students before the closing date."
                  />
                </div>

                <button type="submit" className="btn btn-primary mt-5">
                  Save
                </button>
              </form>

              <div className="mt-4 flex flex-wrap gap-4">
                {window.is_active && closes > now && (
                  <form action={closeAdmissionWindow}>
                    <input type="hidden" name="id" value={window.id} />
                    <button
                      type="submit"
                      className="text-sm font-medium text-coral-600 hover:underline"
                    >
                      Close admissions now
                    </button>
                  </form>
                )}
                <form action={deleteAdmissionWindow}>
                  <input type="hidden" name="id" value={window.id} />
                  <button
                    type="submit"
                    className="text-sm font-medium text-ink-400 hover:text-coral-600 hover:underline"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </Panel>
          );
        })
      )}

      <Panel
        title="Open an admission window"
        description="Students see the enrol button on every open batch while this runs."
      >
        <form action={createAdmissionWindow} className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Title"
            name="title"
            required
            placeholder="Autumn intake 2026"
          />
          <DateTimeField
            label="Opens"
            name="opens_at"
            hint="Leave empty to open immediately."
          />
          <DateTimeField label="Closes" name="closes_at" required />
          <TextArea
            label="Note shown to students"
            name="note"
            rows={2}
            placeholder="Seats are limited — enrol before the closing date."
            className="sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <button type="submit" className="btn btn-primary">
              Open admissions
            </button>
          </div>
        </form>
      </Panel>
    </>
  );
}
