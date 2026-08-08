"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bool, num, requireRole, str } from "./guard";
import type { AttendanceState } from "@/lib/types";

/**
 * Every action here is scoped to one batch, so they all start by proving the
 * caller either teaches it or is an admin. Without this a teacher could pass
 * another teacher's batch id and reach a class that is not theirs.
 */
async function requireBatchAccess(batchId: string) {
  const { user, role, db } = await requireRole(["teacher", "admin", "staff"]);

  if (!batchId) redirect("/admin/classes");

  const { data: batch } = await db
    .from("batches")
    .select("id, teacher_id, course_id")
    .eq("id", batchId)
    .maybeSingle();

  if (!batch) redirect("/admin/classes");

  const mayTeach = role === "admin" || batch.teacher_id === user.id;
  if (!mayTeach) redirect("/admin/classes");

  return { user, role, db, batch };
}

function refresh(batchId: string) {
  revalidatePath(`/admin/classes/${batchId}`);
  revalidatePath("/admin/classes");
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------

/**
 * Opens a register for one date and marks everyone present. The teacher then
 * flips the handful who were not — faster than ticking a full class.
 */
export async function createAttendanceSession(form: FormData) {
  const batchId = str(form, "batch_id");
  const { user, db } = await requireBatchAccess(batchId);

  const heldOn = str(form, "held_on") || new Date().toISOString().slice(0, 10);

  const { data: session, error } = await db
    .from("attendance_sessions")
    .insert({
      batch_id: batchId,
      held_on: heldOn,
      topic: str(form, "topic"),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !session) {
    const reason = error?.code === "23505" ? "session_exists" : "failed";
    redirect(`/admin/classes/${batchId}/attendance?error=${reason}`);
  }

  const { data: students } = await db
    .from("enrollments")
    .select("id")
    .eq("batch_id", batchId)
    .eq("status", "active");

  if (students?.length) {
    await db.from("attendance_records").insert(
      students.map((s) => ({
        session_id: session.id,
        enrollment_id: s.id,
        state: "present" as AttendanceState,
      })),
    );
  }

  refresh(batchId);
  redirect(`/admin/classes/${batchId}/attendance?session=${session.id}`);
}

const STATES: AttendanceState[] = ["present", "absent", "late", "excused"];

/** Saves the whole register in one submit. */
export async function saveAttendance(form: FormData) {
  const batchId = str(form, "batch_id");
  const sessionId = str(form, "session_id");
  const { db } = await requireBatchAccess(batchId);

  if (!sessionId) redirect(`/admin/classes/${batchId}/attendance`);

  const rows: { session_id: string; enrollment_id: string; state: AttendanceState }[] =
    [];

  for (const [field, raw] of form.entries()) {
    if (!field.startsWith("state:")) continue;
    const enrollmentId = field.slice("state:".length);
    const value = String(raw) as AttendanceState;
    if (!enrollmentId || !STATES.includes(value)) continue;
    rows.push({ session_id: sessionId, enrollment_id: enrollmentId, state: value });
  }

  if (rows.length) {
    await db
      .from("attendance_records")
      .upsert(rows, { onConflict: "session_id,enrollment_id" });
  }

  refresh(batchId);
  redirect(`/admin/classes/${batchId}/attendance?session=${sessionId}&saved=1`);
}

export async function deleteAttendanceSession(form: FormData) {
  const batchId = str(form, "batch_id");
  const sessionId = str(form, "session_id");
  const { db } = await requireBatchAccess(batchId);

  await db.from("attendance_sessions").delete().eq("id", sessionId);

  refresh(batchId);
  redirect(`/admin/classes/${batchId}/attendance?deleted=1`);
}

// ---------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------

export async function createAssignment(form: FormData) {
  const batchId = str(form, "batch_id");
  const { user, db } = await requireBatchAccess(batchId);

  const title = str(form, "title");
  if (!title) redirect(`/admin/classes/${batchId}/assignments?error=title`);

  const dueAt = str(form, "due_at");

  const { data, error } = await db
    .from("assignments")
    .insert({
      batch_id: batchId,
      title,
      instructions: str(form, "instructions"),
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      max_score: num(form, "max_score", 100),
      is_published: bool(form, "is_published"),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/admin/classes/${batchId}/assignments?error=failed`);
  }

  refresh(batchId);
  redirect(`/admin/classes/${batchId}/assignments/${data.id}?created=1`);
}

export async function updateAssignment(form: FormData) {
  const batchId = str(form, "batch_id");
  const id = str(form, "id");
  const { db } = await requireBatchAccess(batchId);

  const dueAt = str(form, "due_at");

  await db
    .from("assignments")
    .update({
      title: str(form, "title"),
      instructions: str(form, "instructions"),
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      max_score: num(form, "max_score", 100),
      is_published: bool(form, "is_published"),
    })
    .eq("id", id)
    .eq("batch_id", batchId);

  refresh(batchId);
  redirect(`/admin/classes/${batchId}/assignments/${id}?saved=1`);
}

export async function deleteAssignment(form: FormData) {
  const batchId = str(form, "batch_id");
  const id = str(form, "id");
  const { db } = await requireBatchAccess(batchId);

  await db.from("assignments").delete().eq("id", id).eq("batch_id", batchId);

  refresh(batchId);
  redirect(`/admin/classes/${batchId}/assignments?deleted=1`);
}

/** Marks one submission. Score is clamped to the assignment's maximum. */
export async function gradeSubmission(form: FormData) {
  const batchId = str(form, "batch_id");
  const assignmentId = str(form, "assignment_id");
  const submissionId = str(form, "submission_id");
  const { user, db } = await requireBatchAccess(batchId);

  const { data: assignment } = await db
    .from("assignments")
    .select("max_score")
    .eq("id", assignmentId)
    .eq("batch_id", batchId)
    .maybeSingle();

  if (!assignment) redirect(`/admin/classes/${batchId}/assignments`);

  const raw = num(form, "score", 0);
  const score = Math.max(0, Math.min(raw, Number(assignment.max_score)));

  await db
    .from("assignment_submissions")
    .update({
      score,
      feedback: str(form, "feedback"),
      state: "graded",
      graded_at: new Date().toISOString(),
      graded_by: user.id,
    })
    .eq("id", submissionId)
    .eq("assignment_id", assignmentId);

  refresh(batchId);
  redirect(`/admin/classes/${batchId}/assignments/${assignmentId}?graded=1`);
}

// ---------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------

export async function createGroup(form: FormData) {
  const batchId = str(form, "batch_id");
  const { user, db } = await requireBatchAccess(batchId);

  const name = str(form, "name");
  if (!name) redirect(`/admin/classes/${batchId}/groups?error=name`);

  await db.from("class_groups").insert({
    batch_id: batchId,
    name,
    note: str(form, "note"),
    created_by: user.id,
  });

  refresh(batchId);
  redirect(`/admin/classes/${batchId}/groups?created=1`);
}

export async function deleteGroup(form: FormData) {
  const batchId = str(form, "batch_id");
  const id = str(form, "id");
  const { db } = await requireBatchAccess(batchId);

  await db.from("class_groups").delete().eq("id", id).eq("batch_id", batchId);

  refresh(batchId);
  redirect(`/admin/classes/${batchId}/groups?deleted=1`);
}

/** Replaces a group's membership with whatever was ticked. */
export async function setGroupMembers(form: FormData) {
  const batchId = str(form, "batch_id");
  const groupId = str(form, "group_id");
  const { db } = await requireBatchAccess(batchId);

  const { data: group } = await db
    .from("class_groups")
    .select("id")
    .eq("id", groupId)
    .eq("batch_id", batchId)
    .maybeSingle();

  if (!group) redirect(`/admin/classes/${batchId}/groups`);

  const members = form
    .getAll("member")
    .map((value) => String(value))
    .filter(Boolean);

  await db.from("class_group_members").delete().eq("group_id", groupId);

  if (members.length) {
    await db
      .from("class_group_members")
      .insert(members.map((enrollment_id) => ({ group_id: groupId, enrollment_id })));
  }

  refresh(batchId);
  redirect(`/admin/classes/${batchId}/groups?saved=1`);
}

// ---------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------

/**
 * Saves the teacher's written summary together with a snapshot of the batch
 * statistics, so the numbers in an old report stay as they were on the day.
 */
export async function createReport(form: FormData) {
  const batchId = str(form, "batch_id");
  const { user, db } = await requireBatchAccess(batchId);

  const title = str(form, "title");
  if (!title) redirect(`/admin/classes/${batchId}/report?error=title`);

  const { data: stats } = await db.rpc("batch_stats", { batch: batchId });

  await db.from("batch_reports").insert({
    batch_id: batchId,
    title,
    period_start: str(form, "period_start") || null,
    period_end: str(form, "period_end") || null,
    summary: str(form, "summary"),
    stats: stats ?? {},
    created_by: user.id,
  });

  refresh(batchId);
  redirect(`/admin/classes/${batchId}/report?created=1`);
}

export async function deleteReport(form: FormData) {
  const batchId = str(form, "batch_id");
  const id = str(form, "id");
  const { db } = await requireBatchAccess(batchId);

  await db.from("batch_reports").delete().eq("id", id).eq("batch_id", batchId);

  refresh(batchId);
  redirect(`/admin/classes/${batchId}/report?deleted=1`);
}
