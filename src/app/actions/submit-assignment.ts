"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * A student hands in — or revises — one piece of work.
 *
 * The enrolment is re-checked against the signed-in user rather than trusted
 * from the form, and an already-graded submission is left alone so a student
 * cannot quietly replace work after it has been marked.
 */
export async function submitAssignment(form: FormData) {
  const assignmentId = String(form.get("assignment_id") ?? "");
  const body = String(form.get("body") ?? "").trim();
  const link = String(form.get("link") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  if (!assignmentId) redirect("/dashboard?error=missing");
  if (!body && !link) redirect(`/dashboard?error=empty#a-${assignmentId}`);

  const db = createAdminClient();

  // Which of this student's enrolments does the assignment belong to?
  const { data: assignment } = await db
    .from("assignments")
    .select("id, batch_id, is_published")
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment?.is_published) redirect("/dashboard?error=missing");

  const { data: enrollment } = await db
    .from("enrollments")
    .select("id")
    .eq("batch_id", assignment.batch_id)
    .eq("user_id", user.id)
    .in("status", ["active", "completed"])
    .maybeSingle();

  if (!enrollment) redirect("/dashboard?error=not_enrolled");

  const { data: existing } = await db
    .from("assignment_submissions")
    .select("id, state")
    .eq("assignment_id", assignmentId)
    .eq("enrollment_id", enrollment.id)
    .maybeSingle();

  if (existing?.state === "graded") {
    redirect(`/dashboard?error=already_graded#a-${assignmentId}`);
  }

  if (existing) {
    await db
      .from("assignment_submissions")
      .update({ body, link, submitted_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await db.from("assignment_submissions").insert({
      assignment_id: assignmentId,
      enrollment_id: enrollment.id,
      body,
      link,
    });
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?submitted=1#a-${assignmentId}`);
}
