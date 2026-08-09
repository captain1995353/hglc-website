"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Student-side messaging. The sender is always taken from the session, never
 * from the form — a student cannot post as somebody else, and there is no
 * name or email to fill in because we already know who they are.
 */

async function currentStudent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/messages");
  return user;
}

export async function startConversation(form: FormData) {
  const user = await currentStudent();

  const subject = String(form.get("subject") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();

  if (!body) redirect("/dashboard/messages?error=empty");

  const db = createAdminClient();

  const { data: conversation, error } = await db
    .from("conversations")
    .insert({
      student_id: user.id,
      subject: subject || "General enquiry",
    })
    .select("id")
    .single();

  if (error || !conversation) {
    console.error("startConversation:", error?.message);
    redirect("/dashboard/messages?error=failed");
  }

  await db.from("messages").insert({
    conversation_id: conversation.id,
    sender_id: user.id,
    from_staff: false,
    body,
  });

  revalidatePath("/dashboard/messages");
  redirect(`/dashboard/messages/${conversation.id}`);
}

export async function replyToConversation(form: FormData) {
  const user = await currentStudent();

  const conversationId = String(form.get("conversation_id") ?? "");
  const body = String(form.get("body") ?? "").trim();

  if (!conversationId) redirect("/dashboard/messages");
  if (!body) redirect(`/dashboard/messages/${conversationId}?error=empty`);

  const db = createAdminClient();

  // Re-check ownership rather than trusting the id in the form.
  const { data: conversation } = await db
    .from("conversations")
    .select("id, student_id, is_open")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation || conversation.student_id !== user.id) {
    redirect("/dashboard/messages");
  }
  if (!conversation.is_open) {
    redirect(`/dashboard/messages/${conversationId}?error=closed`);
  }

  await db.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    from_staff: false,
    body,
  });

  revalidatePath(`/dashboard/messages/${conversationId}`);
  redirect(`/dashboard/messages/${conversationId}`);
}

/** Clears the student's unread badge once they have opened the thread. */
export async function markStudentRead(conversationId: string, studentId: string) {
  const db = createAdminClient();
  await db
    .from("conversations")
    .update({ unread_for_student: 0 })
    .eq("id", conversationId)
    .eq("student_id", studentId);
}
