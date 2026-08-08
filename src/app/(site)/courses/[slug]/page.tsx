import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCourse } from "@/lib/data";
import { getI18n, pick, pickList, type Dictionary } from "@/lib/i18n";
import { formatDate, formatMoney } from "@/lib/format";
import { getUser } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";
import { getAdmissionState } from "@/lib/admissions";
import { enroll } from "@/app/actions/enroll";
import type { Batch } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) return { title: "Course" };
  return {
    title: course.title_en,
    description: course.summary_en,
  };
}

function modeLabel(mode: Batch["mode"], t: Dictionary) {
  if (mode === "online") return t.course.modeOnline;
  if (mode === "hybrid") return t.course.modeHybrid;
  return t.course.modeOffline;
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) notFound();

  const { locale, t } = await getI18n();
  const user = await getUser();
  const admissions = await getAdmissionState();

  const outcomes = pickList(course, "outcomes", locale);
  const openBatches = course.batches.filter((b) => b.is_open);
  const korean = course.track === "korean";

  return (
    <>
      <section className="border-b border-ink-100 bg-white">
        <div className="container-page py-12 sm:py-14">
          <Link
            href="/courses"
            className="text-sm font-medium text-ink-400 hover:text-ink-700"
          >
            ← {t.course.backToCourses}
          </Link>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span
              className={`badge ${
                korean ? "bg-coral-50 text-coral-700" : "bg-brand-50 text-brand-700"
              }`}
            >
              {korean ? t.courses.filterKorean : t.courses.filterEnglish}
            </span>
            <span className="text-sm font-medium text-ink-400">{course.level}</span>
          </div>

          <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {pick(course, "title", locale)}
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-ink-500">
            {pick(course, "summary", locale)}
          </p>
        </div>
      </section>

      <section className="container-page grid gap-10 py-12 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        {/* ---------------- Left: description, outcomes, batches -------- */}
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t.course.aboutTitle}</h2>
          <div className="prose-body mt-3 max-w-2xl text-ink-600">
            <p>{pick(course, "description", locale)}</p>
          </div>

          {outcomes.length > 0 && (
            <>
              <h2 className="mt-10 text-xl font-bold tracking-tight">
                {t.course.outcomesTitle}
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {outcomes.map((outcome) => (
                  <li key={outcome} className="flex gap-2.5 text-sm text-ink-600">
                    <span
                      aria-hidden
                      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-[0.65rem] font-bold text-brand-700"
                    >
                      ✓
                    </span>
                    {outcome}
                  </li>
                ))}
              </ul>
            </>
          )}

          <h2 id="batches" className="mt-12 text-xl font-bold tracking-tight">
            {t.course.batchesTitle}
          </h2>

          {admissions.open ? (
            admissions.window && (
              <p className="mt-2 text-sm text-brand-700">
                <strong className="font-semibold">{admissions.window.title}</strong>{" "}
                — enrolment closes {formatDate(admissions.window.closes_at, locale)}.
                {admissions.window.note ? ` ${admissions.window.note}` : ""}
              </p>
            )
          ) : (
            <p className="mt-2 rounded-lg bg-paper-dim px-4 py-3 text-sm text-ink-600">
              {admissions.upcoming
                ? `Admissions are closed. The next intake opens ${formatDate(admissions.upcoming.opens_at, locale)}.`
                : "Admissions are closed at the moment. Contact us and we will tell you when the next intake opens."}
            </p>
          )}

          {openBatches.length === 0 ? (
            <p className="card mt-4 p-6 text-sm text-ink-500">{t.course.noBatches}</p>
          ) : (
            <div className="mt-4 space-y-4">
              {openBatches.map((batch) => {
                const seatsLeft = Math.max(batch.seats_total - batch.seats_taken, 0);
                const full = seatsLeft === 0;

                return (
                  <div key={batch.id} className="card p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-ink-900">
                            {batch.name}
                          </h3>
                          <span
                            className={`badge ${
                              batch.mode === "online"
                                ? "bg-brand-50 text-brand-700"
                                : "bg-ink-100 text-ink-600"
                            }`}
                          >
                            {modeLabel(batch.mode, t)}
                          </span>
                        </div>
                        <dl className="mt-3 grid gap-x-8 gap-y-1.5 text-sm text-ink-500 sm:grid-cols-2">
                          <div className="flex gap-2">
                            <dt className="text-ink-400">{t.course.starts}</dt>
                            <dd className="font-medium text-ink-800">
                              {formatDate(batch.start_date, locale)}
                            </dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="text-ink-400">{t.course.schedule}</dt>
                            <dd className="font-medium text-ink-800">
                              {batch.schedule_text}
                            </dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="text-ink-400">{t.course.seats}</dt>
                            <dd
                              className={`font-medium ${
                                full ? "text-coral-500" : "text-ink-800"
                              }`}
                            >
                              {full
                                ? t.course.full
                                : `${seatsLeft} ${t.course.seatsLeft}`}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <form action={enroll} className="shrink-0">
                        <input type="hidden" name="batch_id" value={batch.id} />
                        <input type="hidden" name="course_id" value={course.id} />
                        <input type="hidden" name="slug" value={course.slug} />
                        <button
                          type="submit"
                          disabled={full || !supabaseConfigured || !admissions.open}
                          className="btn btn-primary whitespace-nowrap"
                        >
                          {!admissions.open
                            ? "Admissions closed"
                            : user
                              ? t.course.enrol
                              : t.course.enrolLogin}
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ---------------- Right: sticky summary ----------------------- */}
        <aside className="card sticky top-24 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-400">
            {t.course.detailsTitle}
          </h2>

          <div className="mt-5 space-y-4 text-sm">
            <Row label={t.course.level} value={course.level} />
            <Row
              label={t.course.duration}
              value={`${course.duration_weeks} ${t.courses.weeks}`}
            />
            <Row
              label={t.course.intensity}
              value={`${course.hours_per_week} ${t.courses.hoursPerWeek}`}
            />
            <Row
              label={t.course.mode}
              value={`${t.course.modeOffline} · ${t.course.modeOnline}`}
            />
          </div>

          <div className="mt-6 border-t border-ink-100 pt-5">
            <p className="text-xs uppercase tracking-wide text-ink-400">
              {t.course.fee}
            </p>
            <p className="mt-1 text-3xl font-bold text-ink-900">
              {formatMoney(course.price_bdt, "BDT", locale)}
            </p>
            <p className="mt-1 text-xs text-ink-400">
              {formatMoney(course.price_usd, "USD", locale)} for international payment
            </p>
          </div>

          <a href="#batches" className="btn btn-primary mt-6 w-full">
            {t.course.batchesTitle}
          </a>
        </aside>
      </section>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-ink-400">{label}</span>
      <span className="text-right font-semibold text-ink-800">{value}</span>
    </div>
  );
}
