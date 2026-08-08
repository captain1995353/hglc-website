"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, str, type Role } from "./guard";
import { usernameToEmail } from "@/lib/staff-usernames";

const ASSIGNABLE: Role[] = ["teacher", "staff", "admin"];

/**
 * Creates a login for a teacher or a staff member. The address is confirmed
 * immediately — these accounts are handed out in person, so there is no inbox
 * to verify and no reason to make someone wait for an email.
 */
export async function createStaffAccount(form: FormData) {
  const { db } = await requireAdmin();

  const username = str(form, "username").toLowerCase().replace(/\s+/g, "");
  const password = str(form, "password");
  const fullName = str(form, "full_name");
  const phone = str(form, "phone");
  const role = str(form, "role") as Role;

  if (!username || !password || !fullName) {
    redirect("/admin/staff?error=fields");
  }
  if (password.length < 8) redirect("/admin/staff?error=password");
  if (!ASSIGNABLE.includes(role)) redirect("/admin/staff?error=role");

  const { data, error } = await db.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone },
  });

  if (error || !data.user) {
    const taken = error?.message?.toLowerCase().includes("already");
    redirect(`/admin/staff?error=${taken ? "taken" : "failed"}`);
  }

  // The signup trigger creates the profile row; set its role and details.
  await db
    .from("profiles")
    .update({ role, full_name: fullName, phone })
    .eq("id", data.user.id);

  revalidatePath("/admin/staff");
  redirect("/admin/staff?created=1");
}

export async function setStaffRole(form: FormData) {
  const { db, user } = await requireAdmin();
  const id = str(form, "id");
  const role = str(form, "role") as Role;

  if (!id) return;
  if (!["student", ...ASSIGNABLE].includes(role)) return;

  // Removing your own admin rights is the one change that can lock everyone
  // out of the dashboard.
  if (id === user.id && role !== "admin") {
    redirect("/admin/staff?error=self");
  }

  await db.from("profiles").update({ role }).eq("id", id);

  revalidatePath("/admin/staff");
  revalidatePath("/admin/students");
}

export async function resetStaffPassword(form: FormData) {
  const { db } = await requireAdmin();
  const id = str(form, "id");
  const password = str(form, "password");

  if (!id) return;
  if (password.length < 8) redirect("/admin/staff?error=password");

  const { error } = await db.auth.admin.updateUserById(id, { password });
  if (error) redirect("/admin/staff?error=failed");

  revalidatePath("/admin/staff");
  redirect("/admin/staff?reset=1");
}

/**
 * Removes a staff login. Their history stays — payments they verified keep
 * pointing at a deleted user via ON DELETE SET NULL — but they can no longer
 * sign in.
 */
export async function deleteStaffAccount(form: FormData) {
  const { db, user } = await requireAdmin();
  const id = str(form, "id");

  if (!id) return;
  if (id === user.id) redirect("/admin/staff?error=self");

  await db.auth.admin.deleteUser(id);

  revalidatePath("/admin/staff");
  redirect("/admin/staff?deleted=1");
}

/** Puts a teacher in charge of a batch, or clears the assignment. */
export async function assignBatchTeacher(form: FormData) {
  const { db } = await requireAdmin();
  const batchId = str(form, "batch_id");
  const teacherId = str(form, "teacher_id");
  const courseId = str(form, "course_id");

  if (!batchId) return;

  await db
    .from("batches")
    .update({ teacher_id: teacherId || null })
    .eq("id", batchId);

  revalidatePath("/admin/staff");
  if (courseId) revalidatePath(`/admin/courses/${courseId}`);
}
