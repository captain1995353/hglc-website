import Link from "next/link";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n";
import { listCourses } from "@/lib/data";
import { CourseCard } from "@/components/CourseCard";
import type { CourseTrack } from "@/lib/types";

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Basic Korean, TOPIK I & II preparation, Foundation English and IELTS preparation — on campus in Dhaka or live online.",
};

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const { locale, t } = await getI18n();
  const { track } = await searchParams;
  const active: CourseTrack | "all" =
    track === "korean" || track === "english" ? track : "all";

  const all = await listCourses();
  const courses = active === "all" ? all : all.filter((c) => c.track === active);

  const filters: { value: CourseTrack | "all"; label: string }[] = [
    { value: "all", label: t.courses.filterAll },
    { value: "korean", label: t.courses.filterKorean },
    { value: "english", label: t.courses.filterEnglish },
  ];

  return (
    <>
      <section className="border-b border-ink-100 bg-white">
        <div className="container-page py-14 sm:py-16">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t.courses.title}
          </h1>
          <p className="mt-3 max-w-2xl text-ink-500">{t.courses.subtitle}</p>

          <div className="mt-8 flex flex-wrap gap-2">
            {filters.map((filter) => {
              const href =
                filter.value === "all" ? "/courses" : `/courses?track=${filter.value}`;
              const selected = filter.value === active;
              return (
                <Link
                  key={filter.value}
                  href={href}
                  aria-current={selected ? "page" : undefined}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                    selected
                      ? "border-ink-900 bg-ink-900 text-white"
                      : "border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:text-ink-900"
                  }`}
                >
                  {filter.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        {courses.length === 0 ? (
          <p className="card p-10 text-center text-ink-500">{t.courses.empty}</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} locale={locale} t={t} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
