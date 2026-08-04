import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/lib/i18n";
import { site } from "@/lib/site";
import { MapEmbed } from "@/components/MapEmbed";

export const metadata: Metadata = {
  title: "About the centre",
  description:
    "Hangeul Global Learning Center teaches Korean and English in Dhaka and online — TOPIK and IELTS preparation, plus beginner courses in both languages.",
};

export default async function AboutPage() {
  const { locale, t } = await getI18n();

  return (
    <>
      <section className="border-b border-ink-100 bg-white">
        <div className="container-page py-14 sm:py-16">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t.about.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-500">
            {t.about.lead}
          </p>
        </div>
      </section>

      <section className="container-page grid gap-12 py-14 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="prose-body max-w-2xl text-ink-600">
          <p>{t.about.body1}</p>
          <p>{t.about.body2}</p>
          <p>{t.about.body3}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/courses" className="btn btn-primary">
              {t.home.ctaPrimary}
            </Link>
            <Link href="/contact" className="btn btn-outline">
              {t.nav.contact}
            </Link>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-400">
              {t.about.visitTitle}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-700">
              {site.address[locale]}
            </p>
            <a
              href={site.mapsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-outline mt-4 w-full"
            >
              {t.about.directions}
            </a>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-400">
              {t.about.hoursTitle}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-700">
              {site.hours[locale]}
            </p>
            <dl className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-400">{t.contact.callUs}</dt>
                <dd>
                  <a
                    href={`tel:${site.phone.replace(/\s/g, "")}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {site.phone}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-400">{t.contact.emailUs}</dt>
                <dd>
                  <a
                    href={`mailto:${site.email}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {site.email}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </section>

      <section className="container-page pb-4">
        <MapEmbed title={`${site.name} — map`} />
      </section>
    </>
  );
}
