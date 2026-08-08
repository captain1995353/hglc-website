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
  const { db, user } = await requireRole(["teacher", "admin"]);

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
        title="My classes"
        subtitle="The batches assigned to you, and who is in them."
      />

      {batches.length === 0 ? (
        <EmptyState>
          No batches are assigned to you yet. An administrator assigns them under
          Staff &amp; teachers.
        </EmptyState>
      ) : (
        batches.map((batch) => {
          const roster = rosterByBatch.get(batch.batch_id) ?? [];

          return (
            <Panel
              key={batch.batch_id}
              title={batch.course_title}
              description={`${batch.batch_name} · ${batch.mode === "online" ? "Live online" : batch.mode === "hybrid" ? "Hybrid" : "On campus"}`}
            >
              <dl className="mb-5 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                <div className="flex gap-2">
                  <dt className="text-ink-400">Starts</dt>
                  <dd className="font-medium text-ink-800">
                    {formatDate(batch.start_date)}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-ink-400">Schedule</dt>
                  <dd className="font-medium text-ink-800">
                    {batch.schedule_text || "—"}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-ink-400">Room / link</dt>
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
                  <dt className="text-ink-400">Students</dt>
                  <dd className="font-medium text-ink-800">
                    {batch.active_students} active · {batch.seats_total} seats
                  </dd>
                </div>
              </dl>

              {roster.length === 0 ? (
                <p className="text-sm text-ink-500">
                  Nobody has been enrolled and paid yet.
                </p>
              ) : (
                <TableShell head={["#", "Student", "Phone", "Enrolled"]} minWidth="32rem">
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
