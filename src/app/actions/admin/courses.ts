"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bool, lines, num, requireAdmin, slugify, str } from "./guard";

function courseFields(form: FormData) {
  const title = str(form, "title_en");
  return {
    slug: str(form, "slug") || slugify(title),
    track: str(form, "track") === "english" ? "english" : "korean",
    title_en: title,
    // The site is English-only, but title_ko is NOT NULL — mirror the English
    // title so the column stays valid if a second language returns later.
    title_ko: title,
    summary_en: str(form, "summary_en"),
    description_en: str(form, "description_en"),
    level: str(form, "level"),
    outcomes_en: lines(form, "outcomes_en"),
    duration_weeks: num(form, "duration_weeks", 12),
    hours_per_week: num(form, "hours_per_week", 4),
    price_bdt: num(form, "price_bdt", 0),
    price_usd: num(form, "price_usd", 0),
    sort_order: num(form, "sort_order", 100),
    is_active: bool(form, "is_active"),
  };
}

/** Public pages that show catalogue data. */
function revalidateCatalogue(slug?: string) {
  revalidatePath("/");
  revalidatePath("/courses");
  if (slug) revalidatePath(`/courses/${slug}`);
  revalidatePath("/admin/courses");
}

export async function createCourse(form: FormData) {
  const { db } = await requireAdmin();
  const fields = courseFields(form);

  if (!fields.title_en) redirect("/admin/courses/new?error=title");

  const { data, error } = await db
    .from("courses")
    .insert(fields)
    .select("id, slug")
    .single();

  if (error || !data) {
    const reason = error?.code === "23505" ? "slug_taken" : "failed";
    redirect(`/admin/courses/new?error=${reason}`);
  }

  revalidateCatalogue(data.slug);
  redirect(`/admin/courses/${data.id}?saved=1`);
}

export async function updateCourse(form: FormData) {
  const { db } = await requireAdmin();
  const id = str(form, "id");
  const fields = courseFields(form);

  if (!id) redirect("/admin/courses");

  const { error } = await db.from("courses").update(fields).eq("id", id);

  if (error) {
    const reason = error.code === "23505" ? "slug_taken" : "failed";
    redirect(`/admin/courses/${id}?error=${reason}`);
  }

  revalidateCatalogue(fields.slug);
  redirect(`/admin/courses/${id}?saved=1`);
}

/**
 * Courses with enrolments cannot be deleted (the FK is ON DELETE RESTRICT,
 * so history stays intact) — those get archived instead.
 */
export async function deleteCourse(form: FormData) {
  const { db } = await requireAdmin();
  const id = str(form, "id");
  if (!id) redirect("/admin/courses");

  const { count } = await db
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", id);

  if ((count ?? 0) > 0) {
    await db.from("courses").update({ is_active: false }).eq("id", id);
    revalidateCatalogue();
    redirect("/admin/courses?archived=1");
  }

  await db.from("courses").delete().eq("id", id);
  revalidateCatalogue();
  redirect("/admin/courses?deleted=1");
}

export async function toggleCourseActive(form: FormData) {
  const { db } = await requireAdmin();
  const id = str(form, "id");
  const next = str(form, "is_active") === "true";

  await db.from("courses").update({ is_active: next }).eq("id", id);
  revalidateCatalogue();
}

// ---------------------------------------------------------------------
// Batches
// ---------------------------------------------------------------------

function batchFields(form: FormData) {
  const mode = str(form, "mode");
  return {
    course_id: str(form, "course_id"),
    name: str(form, "name"),
    mode: mode === "online" || mode === "hybrid" ? mode : "offline",
    start_date: str(form, "start_date"),
    end_date: str(form, "end_date") || null,
    schedule_text: str(form, "schedule_text"),
    room_or_link: str(form, "room_or_link"),
    seats_total: num(form, "seats_total", 20),
    is_open: bool(form, "is_open"),
  };
}

export async function createBatch(form: FormData) {
  const { db } = await requireAdmin();
  const fields = batchFields(form);

  if (!fields.course_id || !fields.name || !fields.start_date) {
    redirect(`/admin/courses/${fields.course_id}?error=batch_fields`);
  }

  await db.from("batches").insert(fields);

  revalidateCatalogue();
  redirect(`/admin/courses/${fields.course_id}?saved=1`);
}

export async function updateBatch(form: FormData) {
  const { db } = await requireAdmin();
  const id = str(form, "id");
  const fields = batchFields(form);

  await db.from("batches").update(fields).eq("id", id);

  revalidateCatalogue();
  redirect(`/admin/courses/${fields.course_id}?saved=1`);
}

export async function deleteBatch(form: FormData) {
  const { db } = await requireAdmin();
  const id = str(form, "id");
  const courseId = str(form, "course_id");

  const { count } = await db
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", id);

  // Students are attached — close it rather than lose their record.
  if ((count ?? 0) > 0) {
    await db.from("batches").update({ is_open: false }).eq("id", id);
    revalidateCatalogue();
    redirect(`/admin/courses/${courseId}?closed=1`);
  }

  await db.from("batches").delete().eq("id", id);
  revalidateCatalogue();
  redirect(`/admin/courses/${courseId}?deleted=1`);
}
