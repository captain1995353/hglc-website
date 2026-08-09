import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n";
import { site } from "@/lib/site";
import { getSettings, setting } from "@/lib/settings";
import { MapEmbed } from "@/components/MapEmbed";
import { sendContactMessage } from "@/app/actions/contact";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Hangeul Global Learning Center in Dhaka — course enquiries, batch start dates and payment help.",
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { locale, t } = await getI18n();
  const { sent, error } = await searchParams;
  const settings = await getSettings();
  // A signed-in student already gave us their details — send them to the
  // thread instead of asking for a name and email a second time.
  const user = await getUser();

  const phone = setting(settings, "contact_phone", locale, site.phone);
  const email = setting(settings, "contact_email", locale, site.email);
  const address = setting(settings, "address", locale, site.address[locale]);
  const hours = setting(settings, "opening_hours", locale, site.hours[locale]);
  const mapsUrl = setting(settings, "maps_url", locale, site.mapsUrl);
  const whatsapp = setting(settings, "contact_whatsapp", locale, "");

  return (
    <>
      <section className="border-b border-ink-100 bg-white">
        <div className="container-page py-14 sm:py-16">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t.contact.title}
          </h1>
          <p className="mt-3 max-w-2xl text-ink-500">{t.contact.subtitle}</p>
        </div>
      </section>

      <section className="container-page grid gap-10 py-12 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        {user ? (
          <div className="card p-7">
            <h2 className="text-lg font-bold text-ink-900">
              You are signed in — message us directly
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Write to us from your account and the whole conversation stays in
              one place, with your name, course and payment history already
              attached. No need to type your details again.
            </p>
            <Link href="/dashboard/messages" className="btn btn-primary mt-5">
              Open my messages
            </Link>
            <p className="mt-4 text-xs text-ink-400">
              Prefer email or phone? The details are on the right.
            </p>
          </div>
        ) : (
        <div className="card p-7">
          {sent && (
            <p className="mb-5 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
              {t.contact.sent}
            </p>
          )}
          {error && (
            <p className="mb-5 rounded-lg bg-coral-50 px-4 py-3 text-sm text-coral-700">
              {t.common.error}
            </p>
          )}

          <form action={sendContactMessage} className="grid gap-4 sm:grid-cols-2">
            {/* Honeypot — hidden from people, tempting to bots. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="hidden"
            />

            <div>
              <label className="field-label" htmlFor="name">
                {t.contact.name}
              </label>
              <input id="name" name="name" required className="field-input" />
            </div>

            <div>
              <label className="field-label" htmlFor="email">
                {t.contact.email}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="field-input"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="phone">
                {t.contact.phone}
              </label>
              <input id="phone" name="phone" type="tel" className="field-input" />
            </div>

            <div>
              <label className="field-label" htmlFor="subject">
                {t.contact.subject}
              </label>
              <input id="subject" name="subject" className="field-input" />
            </div>

            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="message">
                {t.contact.message}
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={6}
                className="field-input resize-y"
              />
            </div>

            <div className="sm:col-span-2">
              <button type="submit" className="btn btn-primary">
                {t.contact.send}
              </button>
            </div>
          </form>
        </div>
        )}

        <aside className="space-y-4">
          <div className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-400">
              {t.contact.findUs}
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm text-ink-700">{address}</p>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline"
            >
              {t.about.directions} →
            </a>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-400">
              {t.contact.callUs}
            </h2>
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="mt-2 block text-lg font-bold text-ink-900 hover:text-brand-700"
            >
              {phone}
            </a>
            <a
              href={`mailto:${email}`}
              className="mt-1 block text-sm text-brand-700 hover:underline"
            >
              {email}
            </a>
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-1 block text-sm text-brand-700 hover:underline"
              >
                WhatsApp
              </a>
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-400">
              {t.contact.hours}
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-700">
              {hours}
            </p>
          </div>
        </aside>
      </section>

      <section className="container-page pb-4">
        <MapEmbed
          title={`${site.name} — map`}
          address={address}
          directionsUrl={mapsUrl}
        />
      </section>
    </>
  );
}
