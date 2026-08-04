import { cookies } from "next/headers";
import { dictionaries, type Dictionary } from "./dictionaries";

export type Locale = "en" | "ko";
export const LOCALES: Locale[] = ["en", "ko"];
export const LOCALE_COOKIE = "hglc_locale";
export const DEFAULT_LOCALE: Locale = "en";

export type { Dictionary };

function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "ko";
}

/** Reads the locale cookie. Server-side only. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/** Convenience for server components: locale + strings in one call. */
export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}

/** Picks the right column from a row that carries `_en` / `_ko` variants. */
export function pick<T extends Record<string, unknown>, K extends string>(
  row: T,
  field: K,
  locale: Locale,
): string {
  const localised = row[`${field}_${locale}` as keyof T];
  if (typeof localised === "string" && localised.trim() !== "") return localised;
  const fallback = row[`${field}_en` as keyof T];
  return typeof fallback === "string" ? fallback : "";
}

/** Same as `pick`, for the string[] columns (outcomes). */
export function pickList<T extends Record<string, unknown>>(
  row: T,
  field: string,
  locale: Locale,
): string[] {
  const localised = row[`${field}_${locale}` as keyof T];
  if (Array.isArray(localised) && localised.length) return localised as string[];
  const fallback = row[`${field}_en` as keyof T];
  return Array.isArray(fallback) ? (fallback as string[]) : [];
}
