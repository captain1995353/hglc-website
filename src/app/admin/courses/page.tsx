import Link from "next/link";
import { requireAdmin } from "@/app/actions/admin/guard";
import { toggleCourseActive } from "@/app/actions/admin/courses";
import {
  AdminHeader,
  EmptyState,
  FlashMessage,
  TableShell,
} from "@/components/admin/ui";
import { formatMoney } from "@/lib/format";

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; archived?: string; error?: string }>;
}) {
  const { db } = await requireAdmin();
  const { deleted, archived, error } = await searchParams;

  const { data: courses } = await db
    .from("courses")
    .select("id, slug, track, title_en, level, price_bdt, price_usd, is_active, sort_order")
    .order("sort_order", { ascending: true });

  const { data: batches } = await db
    .from("batches")
    .select("course_id, is_open, seats_total, seats_taken");

  const batchesByCourse = new Map<string, { open: number; seats: number; taken: number }>();
  for (const batch of batches ?? []) {
    const entry = batchesByCourse.get(batch.course_id) ?? { open: 0, seats: 0, taken: 0 };
    if (batch.is_open) {
      entry.open += 1;
      entry.seats += batch.seats_total;
      entry.taken += batch.seats_taken;
    }
    batchesByCourse.set(batch.course_id, entry);
  }

  return (
    <>
      <AdminHeader
        title="Courses & batches"
        subtitle="What appears in the catalogue, and when each intake starts."
        action={
          <Link href="/admin/courses/new" className="btn btn-primary">
            Add course
          </Link>
        }
      />

      <FlashMessage
        saved={deleted || archived}
        error={error}
        savedText={
          archived
            ? "Course has students enrolled, so it was hidden from the site instead of deleted."
            : "Course deleted."
        }
      />

      {(courses ?? []).length === 0 ? (
        <EmptyState>
          No courses yet. Add your first one, or run supabase/seed.sql for the
          standard five.
        </EmptyState>
      ) : (
        <TableShell
          head={["Course", "Track", "Fee", "Open batches", "Seats", "Live", ""]}
          minWidth="52rem"
        >
          {(courses ?? []).map((course) => {
            const stats = batchesByCourse.get(course.id) ?? {
              open: 0,
              seats: 0,
              taken: 0,
            };

            return (
              <tr key={course.id} className="border-b border-ink-50 last:border-0">
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/courses/${course.id}`}
                    className="font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {course.title_en}
                  </Link>
                  <p className="text-xs text-ink-400">{course.level || course.slug}</p>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`badge ${
                      course.track === "korean"
                        ? "bg-coral-50 text-coral-700"
                        : "bg-brand-50 text-brand-700"
                    }`}
                  >
                    {course.track}
                  </span>
                </td>
                <td className="px-5 py-3 font-semibold text-ink-800">
                  {formatMoney(Number(course.price_bdt), "BDT")}
                  <span className="ml-1 text-xs font-normal text-ink-400">
                    / {formatMoney(Number(course.price_usd), "USD")}
                  </span>
                </td>
                <td className="px-5 py-3 text-ink-600">{stats.open}</td>
                <td className="px-5 py-3 text-ink-600">
                  {stats.seats ? `${stats.taken} / ${stats.seats}` : "—"}
                </td>
                <td className="px-5 py-3">
                  <form action={toggleCourseActive}>
                    <input type="hidden" name="id" value={course.id} />
                    <input
                      type="hidden"
                      name="is_active"
                      value={String(!course.is_active)}
                    />
                    <button
                      type="submit"
                      className={`badge ${
                        course.is_active
                          ? "bg-brand-50 text-brand-700"
                          : "bg-ink-100 text-ink-500"
                      }`}
                    >
                      {course.is_active ? "Visible" : "Hidden"}
                    </button>
                  </form>
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/courses/${course.id}`}
                    className="text-sm font-semibold text-brand-700 hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            );
          })}
        </TableShell>
      )}
    </>
  );
}
