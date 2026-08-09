"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Only columns the form actually submitted are written. A form that omits
  // the emergency fields must not blank them.
  const patch: Record<string, string> = {};
  for (const key of [
    "full_name",
    "phone",
    "address",
    "emergency_name",
    "emergency_phone",
    "emergency_relation",
  ]) {
    if (formData.has(key)) patch[key] = String(formData.get(key) ?? "").trim();
  }

  if (Object.keys(patch).length > 0) {
    await supabase.from("profiles").update(patch).eq("id", user.id);
  }

  revalidatePath("/dashboard");
}
