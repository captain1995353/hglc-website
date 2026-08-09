import Link from "next/link";
import { requireOperations } from "@/app/actions/admin/guard";
import { AdminHeader, EmptyState } from "@/components/admin/ui";
import { LocalTime } from "@/components/LocalTime";

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { db } = await requireOperations();
  const { filter } = await searchParams;
  const active = filter === "closed" ? "closed" : filter === "all" ? "all" : "open";

  let query = db
    .from("conversations")
    .select("id, subject, is_open, last_message_at, unread_for_staff, student_id")
    .order("last_message_at", { ascending: false })
    .limit(200);

  if (active === "open") query = query.eq("is_open", true);
  if (active === "closed") query = query.eq("is_open", false);

  const { data: conversations } = await query;
  const threads = conversations ?? [];

  const studentIds = [...new Set(threads.map((t) => t.student_id))];
  const { data: profiles } = studentIds.length
    ? await db.from("profiles").select("id, full_name, phone").in("id", studentIds)
    : { data: [] };

  const byId = new Map(
    (profiles ?? []).map((p) => [p.id, p as { full_name: string; phone: string }]),
  );

  const filters = [
    { value: "open", label: "Open" },
    { value: "closed", label: "Closed" },
    { value: "all", label: "All" },
  ];

  return (
    <>
      <AdminHeader
        title="Student messages"
        subtitle="Direct conversations from the student portal. Enquiries from the public contact form are under Enquiries."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((option) => {
          const selected = option.value === active;
          return (
            <Link
              key={option.value}
              href={`/admin/conversations?filter=${option.value}`}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                selected
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-ink-200 bg-white text-ink-600 hover:border-ink-300"
              }`}
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      {threads.length === 0 ? (
        <EmptyState>
          {active === "open"
            ? "No open conversations. Students can message you from My Learning."
            : "Nothing here."}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {threads.map((thread) => {
            const student = byId.get(thread.student_id);

            return (
              <li key={thread.id}>
                <Link
                  href={`/admin/conversations/${thread.id}`}
                  className="card block p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink-900">
                        {thread.subject || "General enquiry"}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-500">
                        {student?.full_name || "(no name)"}
                        {student?.phone ? ` · ${student.phone}` : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        Last activity <LocalTime iso={thread.last_message_at} />
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {thread.unread_for_staff > 0 && (
                        <span className="badge bg-coral-500 text-white">
                          {thread.unread_for_staff} new
                        </span>
                      )}
                      {!thread.is_open && (
                        <span className="badge bg-ink-100 text-ink-500">Closed</span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
