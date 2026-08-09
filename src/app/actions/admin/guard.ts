import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/env";
import {
  getAdminDictionary,
  type AdminDictionary,
  type DashboardLocale,
} from "@/lib/i18n/admin";

export type Role = "student" | "teacher" | "staff" | "admin";

/** Everyone who may open the dashboard at all. */
export const DASHBOARD_ROLES: Role[] = ["teacher", "staff", "admin"];

/** Admin and front-desk staff — the people who run day-to-day operations. */
export const OPERATIONS_ROLES: Role[] = ["staff", "admin"];

export const ROLE_LABELS: Record<Role, string> = {
  student: "Student",
  teacher: "Teacher",
  staff: "Staff",
  admin: "Administrator",
};

/**
 * Gate for every dashboard page and action. Returns the signed-in person,
 * their role, and a service-role client. Anyone without one of `allowed` is
 * redirected before a query runs.
 */
export async function requireRole(allowed: Role[] = DASHBOARD_ROLES) {
  if (!supabaseConfigured) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // `*` rather than a column list on purpose: naming a column that a pending
  // migration has not added yet fails the whole query, which would read as
  // "no profile" and lock every member of staff out of the dashboard.
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // `role` arrives only after roles.sql has been applied; fall back to the
  // older is_admin flag so the dashboard keeps working either way.
  const role: Role =
    (profile?.role as Role | undefined) ?? (profile?.is_admin ? "admin" : "student");

  if (!allowed.includes(role)) {
    // Signed in, but not for this area.
    redirect(role === "student" ? "/dashboard" : "/admin");
  }

  // `dashboard_locale` arrives only after that migration has run; English
  // until then rather than a crash.
  const locale: DashboardLocale =
    profile?.dashboard_locale === "ko" ? "ko" : "en";
  const t: AdminDictionary = getAdminDictionary(locale);

  return {
    user,
    role,
    locale,
    t,
    profile: { full_name: profile?.full_name ?? "", role },
    db: createAdminClient(),
  };
}

/** Shorthand for the admin-only screens. */
export async function requireAdmin() {
  return requireRole(["admin"]);
}

/** Shorthand for screens staff share with admins. */
export async function requireOperations() {
  return requireRole(OPERATIONS_ROLES);
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
