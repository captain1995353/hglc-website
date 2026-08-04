import { getLocale } from "@/lib/i18n";
import { getSettings, setting } from "@/lib/settings";

/** Optional strip above the header. Hidden when the setting is blank. */
export async function AnnouncementBar() {
  const locale = await getLocale();
  const settings = await getSettings();
  const text = setting(settings, "announcement", locale, "").trim();

  if (!text) return null;

  return (
    <div className="bg-ink-900 text-white">
      <p className="container-page py-2 text-center text-xs sm:text-sm">{text}</p>
    </div>
  );
}
