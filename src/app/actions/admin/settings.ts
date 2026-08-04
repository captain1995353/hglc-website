"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "./guard";

/**
 * Saves the whole settings form in one go. Fields arrive as
 * `en:<key>` / `ko:<key>` so a single pass can rebuild every row.
 */
export async function saveSettings(form: FormData) {
  const { db } = await requireAdmin();

  const updates = new Map<string, { value_en: string; value_ko: string }>();

  for (const [field, raw] of form.entries()) {
    const value = typeof raw === "string" ? raw.trim() : "";
    const [prefix, ...rest] = field.split(":");
    if (prefix !== "en" && prefix !== "ko") continue;

    const key = rest.join(":");
    if (!key) continue;

    const entry = updates.get(key) ?? { value_en: "", value_ko: "" };
    if (prefix === "en") entry.value_en = value;
    else entry.value_ko = value;
    updates.set(key, entry);
  }

  if (updates.size === 0) redirect("/admin/settings");

  // One statement per row keeps it readable; the table is tiny.
  await Promise.all(
    [...updates].map(([key, value]) =>
      db.from("site_settings").update(value).eq("key", key),
    ),
  );

  // Settings show up on every public page.
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}
