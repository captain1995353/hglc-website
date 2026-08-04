import { setLocale } from "@/app/actions/locale";
import type { Locale } from "@/lib/i18n";

/** Two-button toggle. Posts to a server action that sets the locale cookie. */
export function LocaleSwitch({
  locale,
  inverted = false,
}: {
  locale: Locale;
  inverted?: boolean;
}) {
  const options: { value: Locale; label: string }[] = [
    { value: "en", label: "EN" },
    { value: "ko", label: "한국어" },
  ];

  return (
    <form
      action={setLocale}
      className={`inline-flex items-center rounded-full p-0.5 ${
        inverted ? "bg-white/10" : "bg-ink-100"
      }`}
    >
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
                ? inverted
                  ? "bg-white text-ink-900"
                  : "bg-white text-ink-900 shadow-sm"
                : inverted
                  ? "text-ink-200 hover:text-white"
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
