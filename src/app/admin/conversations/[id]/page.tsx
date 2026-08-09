import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOperations } from "@/app/actions/admin/guard";
import {
  markStaffRead,
  replyAsStaff,
  setConversationOpen,
} from "@/app/actions/admin/conversations";
import { AdminHeader, BackLink, Panel } from "@/components/admin/ui";
import { MessageThread, type ThreadMessage } from "@/components/MessageThread";

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { db } = await requireOperations();

  const { data: conversation } = await db
    .from("conversations")
    .select("id, subject, is_open, student_id, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!conversation) notFound();

  const [{ data: messages }, { data: student }] = await Promise.all([
    db
      .from("messages")
      .select("id, body, from_staff, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true }),
    db
      .from("profiles")
      .select("full_name, phone, address, emergency_name, emergency_phone, emergency_relation")
      .eq("id", conversation.student_id)
      .maybeSingle(),
  ]);

  // Opening the thread is what clears the badge.
  await markStaffRead(id);

  return (
    <>
      <BackLink href="/admin/conversations">All conversations</BackLink>
      <AdminHeader
        title={conversation.subject || "General enquiry"}
        subtitle={student?.full_name || "Student"}
        action={
          <form action={setConversationOpen}>
            <input type="hidden" name="conversation_id" value={id} />
            <input
              type="hidden"
              name="is_open"
              value={String(!conversation.is_open)}
            />
            <button type="submit" className="btn btn-outline">
              {conversation.is_open ? "Close conversation" : "Reopen"}
            </button>
          </form>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-start">
        <div>
          <Panel>
            <MessageThread
              messages={(messages ?? []) as ThreadMessage[]}
              viewer="staff"
              studentName={student?.full_name || "Student"}
              staffName="You"
            />
          </Panel>

          {error === "empty" && (
            <p className="mb-4 rounded-lg bg-coral-50 px-4 py-3 text-sm text-coral-700">
              Write a reply before sending.
            </p>
          )}

          {conversation.is_open ? (
            <form action={replyAsStaff}>
              <input type="hidden" name="conversation_id" value={id} />
              <label className="field-label" htmlFor="body">
                Reply
              </label>
              <textarea
                id="body"
                name="body"
                rows={4}
                required
                className="field-input resize-y"
              />
              <button type="submit" className="btn btn-primary mt-3">
                Send reply
              </button>
            </form>
          ) : (
            <p className="rounded-lg bg-paper-dim px-4 py-3 text-sm text-ink-600">
              This conversation is closed. Reopen it to reply.
            </p>
          )}
        </div>

        <aside className="card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-400">
            Student
          </h2>
          <p className="mt-3 font-semibold text-ink-900">
            {student?.full_name || "(no name)"}
          </p>
          {student?.phone && (
            <a
              href={`tel:${student.phone.replace(/\s/g, "")}`}
              className="text-sm text-brand-700 hover:underline"
            >
              {student.phone}
            </a>
          )}

          {student?.address && (
            <p className="mt-3 whitespace-pre-line text-sm text-ink-600">
              {student.address}
            </p>
          )}

          {student?.emergency_phone && (
            <div className="mt-4 border-t border-ink-100 pt-4">
              <p className="text-xs uppercase tracking-wide text-ink-400">
                Emergency contact
              </p>
              <p className="mt-1 text-sm font-medium text-ink-800">
                {student.emergency_name || "—"}
                {student.emergency_relation ? ` (${student.emergency_relation})` : ""}
              </p>
              <a
                href={`tel:${student.emergency_phone.replace(/\s/g, "")}`}
                className="text-sm text-brand-700 hover:underline"
              >
                {student.emergency_phone}
              </a>
            </div>
          )}

          <Link
            href={`/admin/students/${conversation.student_id}`}
            className="btn btn-outline mt-5 w-full"
          >
            Open student record
          </Link>
        </aside>
      </div>
    </>
  );
}
