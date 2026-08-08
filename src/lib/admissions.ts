import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";
import type { AdmissionWindow } from "@/lib/types";

export type AdmissionState = {
  open: boolean;
  window: AdmissionWindow | null;
  /** The next window, when none is open right now. */
  upcoming: AdmissionWindow | null;
};

/**
 * Whether the centre is currently accepting enrolments. Cached per request so
 * the catalogue, the course page and the enrol action agree with each other.
 */
export const getAdmissionState = cache(async (): Promise<AdmissionState> => {
  if (!supabaseConfigured) {
    return { open: true, window: null, upcoming: null };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: live } = await supabase
    .from("admission_windows")
    .select("*")
    .eq("is_active", true)
    .lte("opens_at", now)
    .gte("closes_at", now)
    .order("closes_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (live) {
    return { open: true, window: live as AdmissionWindow, upcoming: null };
  }

  const { data: next } = await supabase
    .from("admission_windows")
    .select("*")
    .eq("is_active", true)
    .gt("opens_at", now)
    .order("opens_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return { open: false, window: null, upcoming: (next as AdmissionWindow) ?? null };
});
