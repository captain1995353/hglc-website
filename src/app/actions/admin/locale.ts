"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DashboardLocale } from "@/lib/i18n/admin";

/**
 * Switches the dashboard language for the signed-in member of staff.
 *
 * Stored on their profile rather than a cookie, so a Korean teacher gets
 * Korean on the office machine and on their own laptop without setting it
 * twice. Nothing about the public site changes.
 */
export async function setDashboardLocale(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const next = String(formData.get("locale") ?? "en");
  const locale: DashboardLocale = next === "ko" ? "ko" : "en";

  await createAdminClient()
    .from("profiles")
    .update({ dashboard_locale: locale })
    .eq("id", user.id);

  revalidatePath("/admin", "layout");
}
