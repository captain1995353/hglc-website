"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { requireRole, str } from "./guard";

/**
 * Permanently removes a student and everything attached to them — enrolments,
 * payments, submissions, attendance marks.
 *
 * Guarded by the admin re-entering their own password, because unlike every
 * other action here this one cannot be undone. The check is done with a
 * throwaway Supabase client so verifying the password never touches the
 * caller's live session cookies.
 */
async function confirmPassword(email: string, password: string) {
  const probe = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    },
  );

  const { error } = await probe.auth.signInWithPassword({ email, password });
  return !error;
}

export async function deleteStudent(form: FormData) {
  const { user, db } = await requireRole(["admin"]);

  const id = str(form, "id");
  const password = str(form, "password");

  if (!id) redirect("/admin/students");
  if (id === user.id) redirect(`/admin/students/${id}?error=self_delete`);
  if (!password) redirect(`/admin/students/${id}?error=password_required`);

  if (!user.email || !(await confirmPassword(user.email, password))) {
    redirect(`/admin/students/${id}?error=wrong_password`);
  }

  // Deleting the auth user cascades to profiles, enrolments and payments.
  const { error } = await db.auth.admin.deleteUser(id);

  if (error) {
    console.error("deleteStudent:", error.message);
    redirect(`/admin/students/${id}?error=delete_failed`);
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin");
  redirect("/admin/students?deleted=1");
}
