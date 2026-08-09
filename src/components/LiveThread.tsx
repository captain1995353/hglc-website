"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageThread, type ThreadMessage } from "@/components/MessageThread";

/**
 * A conversation that updates itself.
 *
 * New messages arrive over Supabase Realtime rather than a poll, so the other
 * side's reply lands without touching the page. Sending goes through the
 * server action — it is the thing that checks the thread is yours and still
 * open — but the message is shown immediately and reconciled when the insert
 * comes back over the socket.
 */
export function LiveThread({
  conversationId,
  initialMessages,
  viewer,
  studentName,
  staffName,
  canSend,
  sendAction,
  closedNotice,
}: {
  conversationId: string;
  initialMessages: ThreadMessage[];
  viewer: "student" | "staff";
  studentName: string;
  staffName: string;
  canSend: boolean;
  /** Server action; validates ownership before writing. */
  sendAction: (formData: FormData) => Promise<void>;
  closedNotice?: React.ReactNode;
}) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // A server re-render (navigation, revalidate) is the source of truth.
  useEffect(() => setMessages(initialMessages), [initialMessages]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`thread:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as ThreadMessage;
          setMessages((current) =>
            // The sender already has this one from its optimistic copy.
            current.some((m) => m.id === row.id) ? current : [...current, row],
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Keep the newest message in view as the thread grows.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length]);

  function onSubmit(formData: FormData) {
    const body = String(formData.get("body") ?? "").trim();
    if (!body) {
      setError("Write a message before sending.");
      return;
    }

    setError(null);

    // Show it straight away; the socket will hand back the real row.
    const optimistic: ThreadMessage = {
      id: `pending-${Date.now()}`,
      body,
      from_staff: viewer === "staff",
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    formRef.current?.reset();

    startTransition(async () => {
      try {
        await sendAction(formData);
      } catch {
        setMessages((current) => current.filter((m) => m.id !== optimistic.id));
        setError("That did not send. Please try again.");
      }
    });
  }

  return (
    <div>
      <MessageThread
        messages={messages}
        viewer={viewer}
        studentName={studentName}
        staffName={staffName}
      />
      <div ref={bottomRef} />

      {error && (
        <p className="mt-4 rounded-lg bg-coral-50 px-4 py-3 text-sm text-coral-700">
          {error}
        </p>
      )}

      {canSend ? (
        <form ref={formRef} action={onSubmit} className="mt-6">
          <input type="hidden" name="conversation_id" value={conversationId} />
          <label className="field-label" htmlFor="body">
            Reply
          </label>
          <textarea
            id="body"
            name="body"
            rows={4}
            className="field-input resize-y"
            placeholder="Type your message…"
          />
          <button type="submit" disabled={pending} className="btn btn-primary mt-3">
            {pending ? "Sending…" : "Send reply"}
          </button>
        </form>
      ) : (
        closedNotice
      )}
    </div>
  );
}
