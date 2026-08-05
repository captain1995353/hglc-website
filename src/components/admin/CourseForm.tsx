import { Checkbox, Field, Panel, Select, TextArea } from "./ui";
import type { Course } from "@/lib/types";

/**
 * Shared by the "add course" and "edit course" screens. Everything the
 * catalogue renders is on this one form, in both languages.
 */
export function CourseForm({
  course,
  action,
  submitLabel,
}: {
  course?: Course;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action}>
      {course && <input type="hidden" name="id" value={course.id} />}

      <Panel title="Basics">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Title"
            name="title_en"
            defaultValue={course?.title_en}
            required
            placeholder="TOPIK I Preparation (Level 1–2)"
          />
          <Select
            label="Track"
            name="track"
            defaultValue={course?.track ?? "korean"}
            options={[
              { value: "korean", label: "Korean" },
              { value: "english", label: "English" },
            ]}
          />
          <Field
            label="Level"
            name="level"
            defaultValue={course?.level}
            placeholder="TOPIK I · Level 1–2"
          />
          <Field
            label="Web address"
            name="slug"
            defaultValue={course?.slug}
            hint="The part after /courses/. Leave empty to build it from the title."
            placeholder="topik-1"
          />
          <Field
            label="Order on the page"
            name="sort_order"
            type="number"
            defaultValue={course?.sort_order ?? 100}
            hint="Lower numbers come first."
          />
        </div>
      </Panel>

      <Panel
        title="Short summary"
        description="One line under the title, on the catalogue card and the course page."
      >
        <TextArea
          label="Summary"
          name="summary_en"
          rows={3}
          defaultValue={course?.summary_en}
        />
      </Panel>

      <Panel title="Full description">
        <TextArea
          label="Description"
          name="description_en"
          rows={6}
          defaultValue={course?.description_en}
        />
      </Panel>

      <Panel
        title="What students will be able to do"
        description="One point per line. These become the ticked list on the course page."
      >
        <TextArea
          label="Outcomes"
          name="outcomes_en"
          rows={6}
          defaultValue={course?.outcomes_en?.join("\n")}
          hint="One per line."
        />
      </Panel>

      <Panel title="Length and fee">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Duration (weeks)"
            name="duration_weeks"
            type="number"
            min="1"
            defaultValue={course?.duration_weeks ?? 12}
          />
          <Field
            label="Class time (hours/week)"
            name="hours_per_week"
            type="number"
            step="0.5"
            min="0"
            defaultValue={course?.hours_per_week ?? 4}
          />
          <Field
            label="Fee in Taka"
            name="price_bdt"
            type="number"
            step="1"
            min="0"
            defaultValue={course?.price_bdt ?? 0}
            hint="Charged through bKash/Nagad/card."
          />
          <Field
            label="Fee in US Dollars"
            name="price_usd"
            type="number"
            step="1"
            min="0"
            defaultValue={course?.price_usd ?? 0}
            hint="Charged to international cards."
          />
        </div>

        <div className="mt-5">
          <Checkbox
            label="Show this course on the website"
            name="is_active"
            defaultChecked={course ? course.is_active : true}
            hint="Turn off to hide it from the catalogue without deleting anything."
          />
        </div>
      </Panel>

      <button type="submit" className="btn btn-primary">
        {submitLabel}
      </button>
    </form>
  );
}
