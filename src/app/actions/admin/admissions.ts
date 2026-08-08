"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bool, requireAdmin, str } from "./guard";

/** Opens a period during which students may enrol. */
export async function createAdmissionWindow(form: FormData) {
  const { db } = await requireAdmin();

  const title = str(form, "title");
  const opensAt = str(form, "opens_at");
  const closesAt = str(form, "closes_at");

  if (!title || !closesAt) redirect("/admin/admissions?error=fields");
  if (opensAt && closesAt <= opensAt) {
    redirect("/admin/admissions?error=order");
  }

  const { error } = await db.from("admission_windows").insert({
    title,
    note: str(form, "note"),
    // Datetime-local gives a wall-clock value; treat it as the server's zone.
    opens_at: opensAt ? new Date(opensAt).toISOString() : new Date().toISOString(),
    closes_at: new Date(closesAt).toISOString(),
    is_active: true,
  });

  if (error) redirect("/admin/admissions?error=failed");

  revalidatePath("/", "layout");
  redirect("/admin/admissions?created=1");
}

export async function updateAdmissionWindow(form: FormData) {
  const { db } = await requireAdmin();
  const id = str(form, "id");
  const closesAt = str(form, "closes_at");

  if (!id || !closesAt) redirect("/admin/admissions?error=fields");

  await db
    .from("admission_windows")
    .update({
      title: str(form, "title"),
      note: str(form, "note"),
      closes_at: new Date(closesAt).toISOString(),
      is_active: bool(form, "is_active"),
    })
    .eq("id", id);

  revalidatePath("/", "layout");
  redirect("/admin/admissions?saved=1");
}

/** Shuts a window immediately without deleting the record. */
export async function closeAdmissionWindow(form: FormData) {
  const { db } = await requireAdmin();
  const id = str(form, "id");
  if (!id) return;

  await db.from("admission_windows").update({ is_active: false }).eq("id", id);

  revalidatePath("/", "layout");
}

export async function deleteAdmissionWindow(form: FormData) {
  const { db } = await requireAdmin();
  const id = str(form, "id");
  if (!id) return;

  await db.from("admission_windows").delete().eq("id", id);

  revalidatePath("/", "layout");
  redirect("/admin/admissions?deleted=1");
}
