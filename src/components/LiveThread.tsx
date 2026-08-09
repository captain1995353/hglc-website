"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageThread, type ThreadMessage } from "@/components/MessageThread";

/**
 * A conversation that updates itself.
 *
 * Two mechanisms, deliberately:
 *
 *  - Supabase Realtime pushes new rows over a websocket, which is instant.
 *    Its auth token is set explicitly rather than relied upon: the browser
 *    client restores its session from cookies, and the socket can open before
 *    that lands — an unauthenticated socket subscribes happily and then
 *    silently receives nothing, because row-level security filters it out.
 *
 *  - A slow poll runs alongside it. Corporate proxies and flaky mobile
 *    networks drop websockets, and a message that never arrives is worse than
 *    one that takes ten seconds.
 *
 * Sending goes through the server action, which is what checks the thread
 * belongs to you and is still open.
 */
const POLL_MS = 10_000;

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
  sendAction: (formData: FormData) => Promise<void>;
  closedNotice?: React.ReactNode;
}) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  /** Adds rows we do not already have, keeping the thread in time order. */
  const merge = useCallback((incoming: ThreadMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((current) => {
      const seen = new Set(current.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      if (fresh.length === 0) return current;
      return [...current, ...fresh].sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      );
    });
  }, []);

  useEffect(() => setMessages(initialMessages), [initialMessages]);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    async function start() {
      // Hand the socket a token before subscribing, or RLS filters
      // everything out and the channel looks healthy while delivering none.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      if (cancelled) return;

      channel = supabase
        .channel(`thread:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => merge([payload.new as ThreadMessage]),
        )
        .subscribe();

      // The safety net. Cheap: one indexed query per ten seconds, and only
      // while the tab is actually being looked at.
      poll = setInterval(async () => {
        if (document.visibilityState !== "visible") return;

        const { data } = await supabase
          .from("messages")
          .select("id, body, from_staff, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (data) merge(data as ThreadMessage[]);
      }, POLL_MS);
    }

    start();

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      if (channel) supabase.removeChannel(channel);
    };
  }, [conversationId, merge]);

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

    // Show it straight away; the real row replaces it when it arrives.
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
