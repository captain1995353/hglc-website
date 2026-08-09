import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { markStudentRead, replyToConversation } from "@/app/actions/messages";
import { LiveThread } from "@/components/LiveThread";
import type { ThreadMessage } from "@/components/MessageThread";

export const metadata: Metadata = { title: "Message", robots: { index: false } };

export default async function StudentThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/dashboard/messages/${id}`);

  const db = createAdminClient();

  const { data: conversation } = await db
    .from("conversations")
    .select("id, subject, is_open, student_id")
    .eq("id", id)
    .maybeSingle();

  if (!conversation || conversation.student_id !== user.id) notFound();

  const { data: messages } = await db
    .from("messages")
    .select("id, body, from_staff, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  // Opening the thread is what marks it read.
  await markStudentRead(id, user.id);

  return (
    <div className="container-page py-12 sm:py-16">
      <Link
        href="/dashboard/messages"
        className="text-sm font-medium text-ink-400 hover:text-ink-700"
      >
        ← All messages
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          {conversation.subject || "General enquiry"}
        </h1>
        {!conversation.is_open && (
          <span className="badge bg-ink-100 text-ink-500">Closed</span>
        )}
      </div>

      <div className="mt-8 max-w-3xl">
        <LiveThread
          conversationId={id}
          initialMessages={(messages ?? []) as ThreadMessage[]}
          viewer="student"
          studentName="You"
          staffName="Hangeul Global"
          canSend={conversation.is_open}
          sendAction={replyToConversation}
          closedNotice={
            <div className="mt-6 rounded-lg bg-paper-dim px-4 py-4 text-sm text-ink-600">
              This conversation is closed.{" "}
              <Link
                href="/dashboard/messages"
                className="font-semibold text-brand-700 hover:underline"
              >
                Start a new one
              </Link>{" "}
              if you need anything else.
            </div>
          }
        />
      </div>
    </div>
  );
}
