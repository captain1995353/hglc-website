import Link from "next/link";
import { pick, type Dictionary, type Locale } from "@/lib/i18n";
import { formatMoney } from "@/lib/format";
import type { Course } from "@/lib/types";

export function CourseCard({
  course,
  locale,
  t,
}: {
  course: Course;
  locale: Locale;
  t: Dictionary;
}) {
  const korean = course.track === "korean";

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="card group flex flex-col p-6 transition-shadow hover:shadow-md"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <span
          className={`badge ${
            korean
              ? "bg-coral-50 text-coral-700"
              : "bg-brand-50 text-brand-700"
          }`}
        >
          {korean ? t.courses.filterKorean : t.courses.filterEnglish}
        </span>
        <span className="text-xs font-medium text-ink-400">{course.level}</span>
      </div>

      <h3 className="text-lg font-bold leading-snug text-ink-900 group-hover:text-brand-700">
        {pick(course, "title", locale)}
      </h3>

      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-500">
        {pick(course, "summary", locale)}
      </p>

      <dl className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-ink-100 pt-4 text-xs text-ink-500">
        <div>
          <dt className="sr-only">{t.course.duration}</dt>
          <dd>
            <strong className="font-semibold text-ink-800">
              {course.duration_weeks}
            </strong>{" "}
            {t.courses.weeks}
          </dd>
        </div>
        <div>
          <dt className="sr-only">{t.course.intensity}</dt>
          <dd>
            <strong className="font-semibold text-ink-800">
              {course.hours_per_week}
            </strong>{" "}
            {t.courses.hoursPerWeek}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wide text-ink-400">
          {t.courses.from}
        </span>
        <span className="text-lg font-bold text-ink-900">
          {formatMoney(course.price_bdt, "BDT", locale)}
        </span>
      </div>
    </Link>
  );
}
