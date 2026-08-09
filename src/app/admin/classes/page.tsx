import Link from "next/link";
import { requireRole } from "@/app/actions/admin/guard";
import { AdminHeader, EmptyState, Panel, TableShell } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";

type TeacherBatch = {
  batch_id: string;
  batch_name: string;
  mode: string;
  start_date: string;
  schedule_text: string;
  room_or_link: string;
  seats_total: number;
  seats_taken: number;
  is_open: boolean;
  course_title: string;
  active_students: number;
};

/**
 * A teacher's own classes and rosters. Admins can open it too, which is handy
 * when they teach a batch themselves.
 */
export default async function MyClassesPage() {
  const { db, user, t } = await requireRole(["teacher", "admin"]);

  const { data } = await db.rpc("teacher_batches", { teacher: user.id });
  const batches = (data ?? []) as TeacherBatch[];

  const batchIds = batches.map((b) => b.batch_id);

  const { data: enrolments } = batchIds.length
    ? await db
        .from("enrollments")
        .select("id, batch_id, status, user_id, created_at")
        .in("batch_id", batchIds)
        .in("status", ["active", "completed"])
        .order("created_at", { ascending: true })
    : { data: [] };

  const studentIds = [...new Set((enrolments ?? []).map((e) => e.user_id))];
  const { data: profiles } = studentIds.length
    ? await db.from("profiles").select("id, full_name, phone").in("id", studentIds)
    : { data: [] };

  const profileById = new Map(
    (profiles ?? []).map((p) => [p.id, p as { full_name: string; phone: string }]),
  );

  const rosterByBatch = new Map<string, typeof enrolments>();
  for (const row of enrolments ?? []) {
    rosterByBatch.set(row.batch_id, [...(rosterByBatch.get(row.batch_id) ?? []), row]);
  }

  return (
    <>
      <AdminHeader
        title={t.classes.title}
        subtitle={t.classes.subtitle}
      />

      {batches.length === 0 ? (
        <EmptyState>
          {t.classes.none}
        </EmptyState>
      ) : (
        batches.map((batch) => {
          const roster = rosterByBatch.get(batch.batch_id) ?? [];

          return (
            <Panel key={batch.batch_id}>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-ink-900">
                    <Link
                      href={`/admin/classes/${batch.batch_id}`}
                      className="hover:text-brand-700"
                    >
                      {batch.course_title}
                    </Link>
                  </h2>
                  <p className="mt-1 text-sm text-ink-500">
                    {batch.batch_name} ·{" "}
                    {batch.mode === "online"
                      ? t.classes.online
                      : batch.mode === "hybrid"
                        ? t.classes.hybrid
                        : t.classes.onCampus}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/classes/${batch.batch_id}/attendance`}
                    className="btn btn-primary px-3 py-1.5 text-xs"
                  >
                    {t.classes.takeAttendance}
                  </Link>
                  <Link
                    href={`/admin/classes/${batch.batch_id}`}
                    className="btn btn-outline px-3 py-1.5 text-xs"
                  >
                    {t.classes.openClass}
                  </Link>
                </div>
              </div>
              <dl className="mb-5 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                <div className="flex gap-2">
                  <dt className="text-ink-400">{t.classes.starts}</dt>
                  <dd className="font-medium text-ink-800">
                    {formatDate(batch.start_date)}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-ink-400">{t.classes.schedule}</dt>
                  <dd className="font-medium text-ink-800">
                    {batch.schedule_text || "—"}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-ink-400">{t.classes.roomOrLink}</dt>
                  <dd className="font-medium text-ink-800">
                    {batch.room_or_link.startsWith("http") ? (
                      <a
                        href={batch.room_or_link}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-brand-700 underline"
                      >
                        {batch.room_or_link}
                      </a>
                    ) : (
                      batch.room_or_link || "—"
                    )}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-ink-400">{t.classes.students}</dt>
                  <dd className="font-medium text-ink-800">
                    {batch.active_students} {t.classes.active} · {batch.seats_total} {t.classes.seats}
                  </dd>
                </div>
              </dl>

              {roster.length === 0 ? (
                <p className="text-sm text-ink-500">
                  {t.classes.nobodyYet}
                </p>
              ) : (
                <TableShell head={["#", t.common.student, t.common.phone, t.classes.enrolled]} minWidth="32rem">
                  {roster.map((row, index) => {
                    const profile = profileById.get(row.user_id);
                    return (
                      <tr key={row.id} className="border-b border-ink-50 last:border-0">
                        <td className="px-5 py-3 text-ink-400">{index + 1}</td>
                        <td className="px-5 py-3 font-medium text-ink-800">
                          {profile?.full_name || "(no name)"}
                        </td>
                        <td className="px-5 py-3 text-ink-600">
                          {profile?.phone ? (
                            <a
                              href={`tel:${profile.phone.replace(/\s/g, "")}`}
                              className="hover:text-brand-700 hover:underline"
                            >
                              {profile.phone}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-5 py-3 text-ink-500">
                          {formatDate(row.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </TableShell>
              )}
            </Panel>
          );
        })
      )}
    </>
  );
}
