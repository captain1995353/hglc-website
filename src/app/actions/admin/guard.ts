import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/env";

/**
 * Every admin action starts here. Returns the signed-in admin plus a
 * service-role client; anyone else is redirected out before a query runs.
 */
export async function requireAdmin() {
  if (!supabaseConfigured) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) redirect("/dashboard");

  return { user, profile, db: createAdminClient() };
}

/** Form helpers — forms only ever hand us strings. */
export const str = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();

export const num = (form: FormData, key: string, fallback = 0) => {
  const value = Number(String(form.get(key) ?? "").trim());
  return Number.isFinite(value) ? value : fallback;
};

export const bool = (form: FormData, key: string) => form.get(key) === "on";

/** Textarea with one item per line -> string[] for the outcomes columns. */
export const lines = (form: FormData, key: string) =>
  String(form.get(key) ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/** Turns a title into a URL-safe slug. */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
