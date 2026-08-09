import "server-only";

import { redirect } from "next/navigation";
import { requireRole } from "@/app/actions/admin/guard";
import type { BatchStats, BatchStudentStat } from "@/lib/types";

export type ClassBatch = {
  id: string;
  name: string;
  mode: string;
  start_date: string;
  end_date: string | null;
  schedule_text: string;
  room_or_link: string;
  seats_total: number;
  seats_taken: number;
  is_open: boolean;
  teacher_id: string | null;
  course_id: string;
  course_title: string;
};

/**
 * Loads one batch for the classroom screens, after checking the caller
 * actually teaches it. Admins may open any batch; a teacher may only open
 * their own.
 */
export async function loadClass(batchId: string) {
  const { user, role, db, t, locale } = await requireRole(["teacher", "admin"]);

  const { data } = await db
    .from("batches")
    .select(
      "id, name, mode, start_date, end_date, schedule_text, room_or_link, seats_total, seats_taken, is_open, teacher_id, course_id, course:courses (title_en)",
    )
    .eq("id", batchId)
    .maybeSingle();

  if (!data) redirect("/admin/classes");
  if (role !== "admin" && data.teacher_id !== user.id) redirect("/admin/classes");

  const course = (Array.isArray(data.course) ? data.course[0] : data.course) as
    | { title_en: string }
    | null;

  const batch: ClassBatch = {
    id: data.id,
    name: data.name,
    mode: data.mode,
    start_date: data.start_date,
    end_date: data.end_date,
    schedule_text: data.schedule_text,
    room_or_link: data.room_or_link,
    seats_total: data.seats_total,
    seats_taken: data.seats_taken,
    is_open: data.is_open,
    teacher_id: data.teacher_id,
    course_id: data.course_id,
    course_title: course?.title_en ?? "Course",
  };

  return { user, role, db, t, locale, batch };
}

export const EMPTY_STATS: BatchStats = {
  active_students: 0,
  sessions_held: 0,
  attendance_rate: null,
  assignments_published: 0,
  submissions_received: 0,
  submissions_graded: 0,
  average_score: null,
};

export async function loadBatchStats(
  db: Awaited<ReturnType<typeof loadClass>>["db"],
  batchId: string,
): Promise<BatchStats> {
  const { data } = await db.rpc("batch_stats", { batch: batchId });
  return { ...EMPTY_STATS, ...((data as BatchStats) ?? {}) };
}

export async function loadStudentStats(
  db: Awaited<ReturnType<typeof loadClass>>["db"],
  batchId: string,
): Promise<BatchStudentStat[]> {
  const { data } = await db.rpc("batch_student_stats", { batch: batchId });
  return (data ?? []) as BatchStudentStat[];
}
