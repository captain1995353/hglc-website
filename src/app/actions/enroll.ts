"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";
import { getAdmissionState } from "@/lib/admissions";

/**
 * Creates (or re-uses) an enrolment for the signed-in student and sends them
 * to checkout. Enrolments start as 'pending_payment' — a payment callback or
 * an admin flips them to 'active'.
 */
export async function enroll(formData: FormData) {
  const batchId = String(formData.get("batch_id") || "");
  const courseId = String(formData.get("course_id") || "");
  const slug = String(formData.get("slug") || "");

  if (!supabaseConfigured) redirect(`/courses/${slug}?error=preview`);

  // The button is hidden while admissions are shut; this stops a stale page
  // or a hand-made request from slipping through anyway.
  const admissions = await getAdmissionState();
  if (!admissions.open) redirect(`/courses/${slug}?error=admissions_closed`);
  if (!batchId || !courseId) redirect(`/courses/${slug}?error=missing`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/courses/${slug}`);

  // Already enrolled in this batch? Send them where it makes sense.
  const { data: existing } = await supabase
    .from("enrollments")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("batch_id", batchId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "pending_payment") redirect(`/checkout/${existing.id}`);
    redirect("/dashboard");
  }

  // Refuse if the batch closed or filled up while they were reading the page.
  const { data: batch } = await supabase
    .from("batches")
    .select("id, is_open, seats_total, seats_taken")
    .eq("id", batchId)
    .maybeSingle();

  if (!batch || !batch.is_open || batch.seats_taken >= batch.seats_total) {
    redirect(`/courses/${slug}?error=full`);
  }

  const { data: created, error } = await supabase
    .from("enrollments")
    .insert({
      user_id: user.id,
      course_id: courseId,
      batch_id: batchId,
      status: "pending_payment",
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("enroll:", error?.message);
    redirect(`/courses/${slug}?error=failed`);
  }

  revalidatePath("/dashboard");
  redirect(`/checkout/${created.id}`);
}
