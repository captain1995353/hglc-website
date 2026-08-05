import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";
import type { Locale } from "@/lib/i18n";

export type SettingRow = {
  key: string;
  value_en: string;
  value_ko: string;
  group_name: string;
  label: string;
  hint: string;
  is_long: boolean;
  bilingual: boolean;
  sort_order: number;
};

export type Settings = Record<string, { en: string; ko: string }>;

/** Values used when the table is empty or Supabase is not connected. */
const FALLBACKS: Settings = {
  contact_phone: { en: "+880 1XXX-XXXXXX", ko: "" },
  contact_email: { en: "info@hangeulglobal.com", ko: "" },
  address: { en: "Dhaka, Bangladesh", ko: "방글라데시 다카" },
  opening_hours: {
    en: "Saturday–Thursday · 9:00 AM – 8:30 PM · Friday closed",
    ko: "토–목 · 오전 9:00 – 오후 8:30 · 금요일 휴무",
  },
  maps_url: {
    en: "https://www.google.com/maps/place/Hangeul+Global+Learning+Center/@23.7488382,90.3774251,17z",
    ko: "",
  },
  tagline: {
    en: "Korean & English, taught properly — in Dhaka and online.",
    ko: "제대로 가르치는 한국어와 영어 — 다카 현장 수업과 온라인.",
  },
};

/**
 * Loads every setting once per request. `cache` dedupes the query across all
 * the components that ask for it while rendering a single page.
 */
export const getSettings = cache(async (): Promise<Settings> => {
  if (!supabaseConfigured) return FALLBACKS;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value_en, value_ko");

  if (error || !data?.length) return FALLBACKS;

  const settings: Settings = { ...FALLBACKS };
  for (const row of data) {
    settings[row.key] = { en: row.value_en ?? "", ko: row.value_ko ?? "" };
  }
  return settings;
});

/** Full rows including labels — only the settings editor needs these. */
export async function getSettingRows(): Promise<SettingRow[]> {
  if (!supabaseConfigured) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("*")
    .order("group_name", { ascending: true })
    .order("sort_order", { ascending: true });

  return (data ?? []) as SettingRow[];
}

/**
 * Reads one setting in the given locale, falling back to English and then to
 * the supplied default. Empty strings count as "not set" so a blank field in
 * the dashboard means "use the built-in wording".
 */
export function setting(
  settings: Settings,
  key: string,
  _locale: Locale = "en",
  fallback = "",
): string {
  const entry = settings[key];
  if (!entry) return fallback;
  return entry.en.trim() ? entry.en : fallback;
}
