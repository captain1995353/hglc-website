import { setDashboardLocale } from "@/app/actions/admin/locale";
import type { DashboardLocale } from "@/lib/i18n/admin";

/**
 * English / Korean for the dashboard only. Server-rendered so the action
 * stays on the server; the preference lives on the staff member's profile.
 */
export function LanguageSwitch({ locale }: { locale: DashboardLocale }) {
  const options: { value: DashboardLocale; label: string }[] = [
    { value: "en", label: "EN" },
    { value: "ko", label: "한국어" },
  ];

  return (
    <form action={setDashboardLocale} className="hidden items-center rounded-full bg-ink-100 p-0.5 sm:inline-flex">
      {options.map((option) => {
        const active = option.value === locale;
        return (
          <button
            key={option.value}
            type="submit"
            name="locale"
            value={option.value}
            aria-pressed={active}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
              active
                ? "bg-white text-ink-900 shadow-sm"
                : "text-ink-500 hover:text-ink-800"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </form>
  );
}
