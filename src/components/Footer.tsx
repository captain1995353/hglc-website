import Link from "next/link";
import { getI18n } from "@/lib/i18n";
import { site } from "@/lib/site";
import { getSettings, setting } from "@/lib/settings";
import { Logo } from "./Logo";

export async function Footer() {
  const { locale, t } = await getI18n();
  const settings = await getSettings();
  const year = new Date().getFullYear();

  const phone = setting(settings, "contact_phone", locale, site.phone);
  const email = setting(settings, "contact_email", locale, site.email);
  const address = setting(settings, "address", locale, site.address[locale]);
  const tagline = setting(settings, "tagline", locale, site.tagline[locale]);
  const mapsUrl = setting(settings, "maps_url", locale, site.mapsUrl);
  const facebook = setting(settings, "facebook_url", locale, "");

  return (
    <footer className="mt-24 border-t border-ink-800 bg-ink-900 text-ink-200">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo inverted />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-300">
            {tagline}
          </p>
          {facebook && (
            <a
              href={facebook}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-4 inline-block text-sm text-ink-300 hover:text-white"
            >
              Facebook →
            </a>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
            {t.footer.courses}
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/courses/korean-beginner" className="hover:text-white">
                Basic Korean
              </Link>
            </li>
            <li>
              <Link href="/courses/topik-1" className="hover:text-white">
                TOPIK I
              </Link>
            </li>
            <li>
              <Link href="/courses/topik-2" className="hover:text-white">
                TOPIK II
              </Link>
            </li>
            <li>
              <Link href="/courses/english-foundation" className="hover:text-white">
                Basic English
              </Link>
            </li>
            <li>
              <Link href="/courses/ielts-academic" className="hover:text-white">
                IELTS
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
            {t.footer.centre}
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/about" className="hover:text-white">
                {t.nav.about}
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white">
                {t.nav.contact}
              </Link>
            </li>
            <li>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-white"
              >
                {t.about.directions}
              </a>
            </li>
            <li>
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-white">
                {phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${email}`} className="hover:text-white">
                {email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
            {t.footer.account}
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/login" className="hover:text-white">
                {t.nav.login}
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-white">
                {t.nav.signup}
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-white">
                {t.nav.dashboard}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-800">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.name}. {t.footer.rights}
          </p>
          <p>{address}</p>
        </div>
      </div>
    </footer>
  );
}
