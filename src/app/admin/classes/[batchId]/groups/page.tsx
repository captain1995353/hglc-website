import { loadClass } from "@/lib/classroom";
import {
  createGroup,
  deleteGroup,
  setGroupMembers,
} from "@/app/actions/admin/classroom";
import {
  AdminHeader,
  BackLink,
  EmptyState,
  Field,
  FlashMessage,
  Panel,
} from "@/components/admin/ui";
import { ClassTabs } from "@/components/admin/ClassTabs";
import type { ClassGroup } from "@/lib/types";

export default async function GroupsPage({
  params,
  searchParams,
}: {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<{
    created?: string;
    saved?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  const { batchId } = await params;
  const { created, saved, deleted, error } = await searchParams;
  const { db, batch, t } = await loadClass(batchId);

  const { data: groupRows } = await db
    .from("class_groups")
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });

  const groups = (groupRows ?? []) as ClassGroup[];

  const { data: roster } = await db
    .from("enrollments")
    .select("id, user_id")
    .eq("batch_id", batchId)
    .eq("status", "active");

  const userIds = (roster ?? []).map((r) => r.user_id);
  const { data: profiles } = userIds.length
    ? await db.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };

  const nameByUser = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name as string | null]),
  );
  const students = (roster ?? []).map((r) => ({
    enrollmentId: r.id,
    name: nameByUser.get(r.user_id) || "(no name)",
  }));

  const groupIds = groups.map((g) => g.id);
  const { data: memberRows } = groupIds.length
    ? await db
        .from("class_group_members")
        .select("group_id, enrollment_id")
        .in("group_id", groupIds)
    : { data: [] };

  const membersByGroup = new Map<string, Set<string>>();
  for (const row of memberRows ?? []) {
    const set = membersByGroup.get(row.group_id) ?? new Set<string>();
    set.add(row.enrollment_id);
    membersByGroup.set(row.group_id, set);
  }

  const assigned = new Set((memberRows ?? []).map((m) => m.enrollment_id));
  const unassigned = students.filter((s) => !assigned.has(s.enrollmentId));

  return (
    <>
      <BackLink href={`/admin/classes/${batchId}`}>{batch.course_title}</BackLink>
      <AdminHeader
        title={t.groups.title}
        subtitle={`${batch.name} — ${t.groups.subtitle}`}
      />
      <ClassTabs batchId={batchId} t={t} />

      <FlashMessage
        saved={created || saved || deleted}
        error={error}
        savedText={
          created
            ? t.groups.created
            : deleted
              ? t.groups.deleted
              : t.groups.membersSaved
        }
        messages={{ name: "Give the group a name." }}
      />

      {students.length === 0 ? (
        <EmptyState>No active students in this batch yet.</EmptyState>
      ) : (
        <>
          {groups.map((group) => {
            const members = membersByGroup.get(group.id) ?? new Set<string>();

            return (
              <Panel
                key={group.id}
                title={group.name}
                description={group.note || `${members.size} of ${students.length} students`}
              >
                <form action={setGroupMembers}>
                  <input type="hidden" name="batch_id" value={batchId} />
                  <input type="hidden" name="group_id" value={group.id} />

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {students.map((student) => (
                      <label
                        key={student.enrollmentId}
                        className="flex items-center gap-2.5 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          name="member"
                          value={student.enrollmentId}
                          defaultChecked={members.has(student.enrollmentId)}
                          className="h-4 w-4 accent-[#414b96]"
                        />
                        <span className="text-ink-800">{student.name}</span>
                      </label>
                    ))}
                  </div>

                  <button type="submit" className="btn btn-primary mt-5">
                    {t.groups.saveMembers}
                  </button>
                </form>

                <form action={deleteGroup} className="mt-4">
                  <input type="hidden" name="batch_id" value={batchId} />
                  <input type="hidden" name="id" value={group.id} />
                  <button
                    type="submit"
                    className="text-sm font-medium text-coral-600 hover:underline"
                  >
                    {t.groups.deleteGroup}
                  </button>
                </form>
              </Panel>
            );
          })}

          {groups.length > 0 && unassigned.length > 0 && (
            <p className="mb-6 rounded-lg bg-paper-dim px-4 py-3 text-sm text-ink-600">
              <strong className="font-semibold text-ink-800">{t.groups.notInAnyGroup}</strong>{" "}
              {unassigned.map((s) => s.name).join(", ")}
            </p>
          )}

          <Panel title={t.groups.addGroup}>
            <form action={createGroup} className="grid gap-5 sm:grid-cols-2">
              <input type="hidden" name="batch_id" value={batchId} />
              <Field label={t.groups.groupName} name="name" required placeholder="Group A" />
              <Field
                label={t.groups.note}
                name="note"
                placeholder="Speaking practice pairs"
              />
              <div className="sm:col-span-2">
                <button type="submit" className="btn btn-primary">
                  {t.groups.createGroup}
                </button>
              </div>
            </form>
          </Panel>
        </>
      )}
    </>
  );
}
