import { requireOperations } from "@/app/actions/admin/guard";
import { deleteMessage, setMessageHandled } from "@/app/actions/admin/people";
import { AdminHeader, EmptyState } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format";

export default async function AdminMessagesPage() {
  const { db } = await requireOperations();

  const { data: messages } = await db
    .from("contact_messages")
    .select("id, name, email, phone, subject, message, handled, created_at")
    .order("handled", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <AdminHeader
        title="Messages"
        subtitle="Everything sent through the contact form."
      />

      {(messages ?? []).length === 0 ? (
        <EmptyState>No messages yet.</EmptyState>
      ) : (
        <div className="space-y-3">
          {(messages ?? []).map((message) => (
            <article
              key={message.id}
              className={`card p-5 ${message.handled ? "opacity-60" : ""}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-900">
                    {message.name}
                    {message.handled && (
                      <span className="badge ml-2 bg-ink-100 text-ink-500">Handled</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    <a
                      href={`mailto:${message.email}`}
                      className="hover:text-brand-700 hover:underline"
                    >
                      {message.email}
                    </a>
                    {message.phone && (
                      <>
                        {" · "}
                        <a
                          href={`tel:${message.phone.replace(/\s/g, "")}`}
                          className="hover:text-brand-700 hover:underline"
                        >
                          {message.phone}
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <p className="text-xs text-ink-400">
                  {formatDateTime(message.created_at)}
                </p>
              </div>

              {message.subject && (
                <p className="mt-2 text-sm font-semibold text-ink-700">
                  {message.subject}
                </p>
              )}

              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-600">
                {message.message}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <form action={setMessageHandled}>
                  <input type="hidden" name="id" value={message.id} />
                  <input
                    type="hidden"
                    name="handled"
                    value={String(!message.handled)}
                  />
                  <button type="submit" className="btn btn-outline px-3 py-1.5 text-xs">
                    {message.handled ? "Mark unhandled" : "Mark handled"}
                  </button>
                </form>
                <form action={deleteMessage}>
                  <input type="hidden" name="id" value={message.id} />
                  <button
                    type="submit"
                    className="text-xs font-semibold text-coral-600 hover:underline"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
