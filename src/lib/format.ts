import type { Locale } from "@/lib/i18n";

const localeTag: Record<Locale, string> = { en: "en-GB", ko: "ko-KR" };

export function formatMoney(amount: number, currency: string, locale: Locale = "en") {
  const value = Number(amount) || 0;
  if (currency === "BDT") {
    // Intl renders BDT as "BDT 6,000.00" in en-GB — the ৳ symbol reads better.
    return `৳${value.toLocaleString(localeTag[locale], { maximumFractionDigits: 0 })}`;
  }
  return new Intl.NumberFormat(localeTag[locale], {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | Date | null, locale: Locale = "en") {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(localeTag[locale], {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date | null, locale: Locale = "en") {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(localeTag[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
