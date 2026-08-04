import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";
import { DEMO_COURSES, demoBatches } from "@/lib/demo-data";
import type { Batch, Course, CourseWithBatches } from "@/lib/types";

const COURSE_COLUMNS =
  "id, slug, track, title_en, title_ko, summary_en, summary_ko, description_en, description_ko, level, outcomes_en, outcomes_ko, duration_weeks, hours_per_week, price_bdt, price_usd, sort_order, is_active";

/** All active courses, cheapest query — no batches. */
export async function listCourses(): Promise<Course[]> {
  if (!supabaseConfigured) return DEMO_COURSES;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_COLUMNS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("listCourses:", error.message);
    return [];
  }
  return (data ?? []) as Course[];
}

/** One course by slug, with its open batches attached. */
export async function getCourse(slug: string): Promise<CourseWithBatches | null> {
  if (!supabaseConfigured) {
    const course = DEMO_COURSES.find((c) => c.slug === slug);
    return course ? { ...course, batches: demoBatches(course.id) } : null;
  }

  const supabase = await createClient();

  const { data: course, error } = await supabase
    .from("courses")
    .select(COURSE_COLUMNS)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !course) return null;

  const { data: batches } = await supabase
    .from("batches")
    .select("*")
    .eq("course_id", (course as Course).id)
    .order("start_date", { ascending: true });

  return { ...(course as Course), batches: (batches ?? []) as Batch[] };
}

export async function getBatch(id: string): Promise<Batch | null> {
  if (!supabaseConfigured) return null;

  const supabase = await createClient();
  const { data } = await supabase.from("batches").select("*").eq("id", id).maybeSingle();
  return (data as Batch) ?? null;
}

/** Enrolments for the signed-in student, with course + batch joined. */
export async function listMyEnrollments(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrollments")
    .select(
      `id, status, created_at, note, course_id, batch_id,
       course:courses (${COURSE_COLUMNS}),
       batch:batches (*),
       payments (id, status, provider, amount, currency, tran_id, created_at)`,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listMyEnrollments:", error.message);
    return [];
  }
  return data ?? [];
}

export async function listMyPayments(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("id, provider, status, amount, currency, tran_id, provider_ref, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
