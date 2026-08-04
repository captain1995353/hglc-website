import Link from "next/link";
import { getI18n } from "@/lib/i18n";
import { listCourses } from "@/lib/data";
import { CourseCard } from "@/components/CourseCard";
import { LogoMark } from "@/components/LogoMark";
import { site, siteUrl } from "@/lib/site";

/** The logo's four tile colours, reused wherever the site counts to four. */
const TILE_COLOURS = [
  { bar: "bg-coral-500", chip: "bg-coral-500" },
  { bar: "bg-ink-800", chip: "bg-ink-800" },
  { bar: "bg-brand-600", chip: "bg-brand-600" },
  { bar: "bg-plum-600", chip: "bg-plum-600" },
];

export default async function HomePage() {
  const { locale, t } = await getI18n();
  const courses = await listCourses();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: site.name,
    url: siteUrl,
    telephone: site.phone,
    email: site.email,
    address: { "@type": "PostalAddress", addressLocality: "Dhaka", addressCountry: "BD" },
    geo: { "@type": "GeoCoordinates", latitude: site.geo.lat, longitude: site.geo.lng },
    hasMap: site.mapsUrl,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden bg-ink-900 text-white">
        {/* The logo's puzzle mark, blown up as a watermark. */}
        <LogoMark
          onDark
          className="pointer-events-none absolute -right-16 -top-20 h-[26rem] w-[26rem] opacity-[0.09] sm:h-[34rem] sm:w-[34rem]"
        />
        <div
          aria-hidden
          className="absolute -left-24 bottom-[-6rem] h-72 w-72 rounded-full bg-coral-500/25 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -right-10 bottom-[-8rem] h-72 w-72 rounded-full bg-plum-600/25 blur-3xl"
        />

        <div className="container-page relative grid gap-12 py-20 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-28">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-200">
              <span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
              {t.home.eyebrow}
            </p>

            <h1 className="max-w-2xl text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              {t.home.heroTitle}
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-200 sm:text-lg">
              {t.home.heroBody}
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/courses" className="btn btn-accent">
                {t.home.ctaPrimary}
              </Link>
              <a
                href={site.mapsUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="btn border border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                {t.home.ctaSecondary}
              </a>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3 lg:grid-cols-1">
            <div className="bg-ink-900 p-6">
              <dt className="text-xs uppercase tracking-[0.14em] text-ink-400">
                {t.home.statCourses}
              </dt>
              <dd className="mt-1 text-3xl font-bold">{courses.length || 5}</dd>
            </div>
            <div className="bg-ink-900 p-6">
              <dt className="text-xs uppercase tracking-[0.14em] text-ink-400">
                {t.home.statTracks}
              </dt>
              <dd className="mt-1 text-3xl font-bold">TOPIK · IELTS</dd>
            </div>
            <div className="bg-ink-900 p-6">
              <dt className="text-xs uppercase tracking-[0.14em] text-ink-400">
                {t.home.statModes}
              </dt>
              <dd className="mt-1 text-lg font-semibold">{t.home.statModesValue}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ---------------- Tracks ---------------- */}
      <section className="container-page py-16 sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t.home.tracksTitle}
        </h2>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <Link
            href="/courses?track=korean"
            className="card group relative overflow-hidden p-8 transition-shadow hover:shadow-md"
          >
            <span
              aria-hidden
              className="absolute right-5 top-3 text-7xl font-bold text-coral-500/10"
            >
              한
            </span>
            <h3 className="text-xl font-bold text-ink-900 group-hover:text-coral-700">
              {t.home.trackKorean}
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
              {t.home.trackKoreanBody}
            </p>
            <span className="mt-6 inline-block text-sm font-semibold text-coral-500">
              {t.courses.view} →
            </span>
          </Link>

          <Link
            href="/courses?track=english"
            className="card group relative overflow-hidden p-8 transition-shadow hover:shadow-md"
          >
            <span
              aria-hidden
              className="absolute right-5 top-3 text-7xl font-bold text-brand-700/10"
            >
              A
            </span>
            <h3 className="text-xl font-bold text-ink-900 group-hover:text-brand-700">
              {t.home.trackEnglish}
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
              {t.home.trackEnglishBody}
            </p>
            <span className="mt-6 inline-block text-sm font-semibold text-brand-700">
              {t.courses.view} →
            </span>
          </Link>
        </div>

        {courses.length > 0 && (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 3).map((course) => (
              <CourseCard key={course.id} course={course} locale={locale} t={t} />
            ))}
          </div>
        )}
      </section>

      {/* ---------------- Why ---------------- */}
      <section className="bg-paper-dim py-16 sm:py-20">
        <div className="container-page">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t.home.whyTitle}
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {t.home.why.map((item, index) => (
              <div key={item.title} className="card overflow-hidden p-0">
                <div className={`h-1.5 ${TILE_COLOURS[index % 4].bar}`} />
                <div className="p-6">
                  <h3 className="text-base font-bold text-ink-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="container-page py-16 sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t.home.howTitle}
        </h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {t.home.how.map((step, index) => (
            <li key={step.title} className="relative pl-12">
              <span
                className={`absolute left-0 top-0 grid h-9 w-9 place-items-center rounded-lg text-sm font-bold text-white ${
                  TILE_COLOURS[index % 4].chip
                }`}
              >
                {index + 1}
              </span>
              <h3 className="text-base font-bold text-ink-900">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="container-page pb-4">
        <div className="relative overflow-hidden rounded-2xl bg-ink-900 px-8 py-14 text-center text-white sm:px-14">
          <div
            aria-hidden
            className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-brand-500/30 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-plum-500/25 blur-3xl"
          />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t.home.ctaTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-ink-200">{t.home.ctaBody}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/signup" className="btn btn-accent">
                {t.nav.signup}
              </Link>
              <Link
                href="/courses"
                className="btn border border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                {t.home.ctaPrimary}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
