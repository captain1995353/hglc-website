import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { startConversation } from "@/app/actions/messages";
import { LocalTime } from "@/components/LocalTime";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

export default async function StudentMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/messages");

  const db = createAdminClient();

  const { data: conversations } = await db
    .from("conversations")
    .select("id, subject, is_open, last_message_at, unread_for_student")
    .eq("student_id", user.id)
    .order("last_message_at", { ascending: false });

  const threads = conversations ?? [];

  return (
    <div className="container-page py-12 sm:py-16">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-ink-400 hover:text-ink-700"
      >
        ← My Learning
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight">Messages</h1>
      <p className="mt-2 text-ink-500">
        Ask us anything about your course, your batch or your payment. We know
        who you are, so there is nothing to fill in.
      </p>

      {error && (
        <p className="mt-5 rounded-lg bg-coral-50 px-4 py-3 text-sm text-coral-700">
          {error === "empty"
            ? "Write a message before sending."
            : "Something went wrong. Please try again."}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div>
          {threads.length === 0 ? (
            <p className="card p-8 text-center text-sm text-ink-500">
              No messages yet. Start one on the right and we will reply here.
            </p>
          ) : (
            <ul className="space-y-3">
              {threads.map((thread) => (
                <li key={thread.id}>
                  <Link
                    href={`/dashboard/messages/${thread.id}`}
                    className="card block p-5 transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink-900">
                          {thread.subject || "General enquiry"}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-400">
                          Last activity <LocalTime iso={thread.last_message_at} />
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {thread.unread_for_student > 0 && (
                          <span className="badge bg-coral-500 text-white">
                            {thread.unread_for_student} new
                          </span>
                        )}
                        {!thread.is_open && (
                          <span className="badge bg-ink-100 text-ink-500">Closed</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="card p-6">
          <h2 className="text-base font-bold text-ink-900">Start a message</h2>
          <form action={startConversation} className="mt-4 space-y-4">
            <div>
              <label className="field-label" htmlFor="subject">
                Subject
              </label>
              <input
                id="subject"
                name="subject"
                className="field-input"
                placeholder="Question about my batch"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="body">
                Message
              </label>
              <textarea
                id="body"
                name="body"
                rows={5}
                required
                className="field-input resize-y"
              />
            </div>
            <button type="submit" className="btn btn-primary w-full">
              Send
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
