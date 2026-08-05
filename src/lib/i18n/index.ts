import { en, type Dictionary } from "./dictionaries";

/**
 * The site is English-only. The `locale` type and the `_en` column suffixes
 * are kept so a second language can be reintroduced without touching every
 * call site — the database columns for it are still there.
 */
export type Locale = "en";
export const DEFAULT_LOCALE: Locale = "en";

export type { Dictionary };

export async function getLocale(): Promise<Locale> {
  return DEFAULT_LOCALE;
}

export function getDictionary(_locale: Locale = DEFAULT_LOCALE): Dictionary {
  return en;
}

/** Convenience for server components: locale + strings in one call. */
export async function getI18n() {
  return { locale: DEFAULT_LOCALE, t: en };
}

/** Reads the `<field>_en` column off a row. */
export function pick<T extends Record<string, unknown>, K extends string>(
  row: T,
  field: K,
  _locale: Locale = DEFAULT_LOCALE,
): string {
  const value = row[`${field}_en` as keyof T];
  return typeof value === "string" ? value : "";
}

/** Same as `pick`, for the string[] columns (outcomes). */
export function pickList<T extends Record<string, unknown>>(
  row: T,
  field: string,
  _locale: Locale = DEFAULT_LOCALE,
): string[] {
  const value = row[`${field}_en` as keyof T];
  return Array.isArray(value) ? (value as string[]) : [];
}
