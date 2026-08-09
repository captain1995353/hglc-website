"use server";

import { revalidatePath } from "next/cache";
import { requireOperations, str } from "./guard";

/** Staff side of the same threads students write to from their portal. */

export async function replyAsStaff(form: FormData) {
  const { user, db } = await requireOperations();

  const conversationId = str(form, "conversation_id");
  const body = str(form, "body");

  if (!conversationId || !body) return;

  await db.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    from_staff: true,
    body,
  });

  // The student now has something to read; staff have nothing outstanding.
  await db
    .from("conversations")
    .update({ unread_for_staff: 0 })
    .eq("id", conversationId);

  revalidatePath(`/admin/conversations/${conversationId}`);
  revalidatePath("/admin/conversations");
}

export async function setConversationOpen(form: FormData) {
  const { db } = await requireOperations();

  const conversationId = str(form, "conversation_id");
  const open = str(form, "is_open") === "true";

  if (!conversationId) return;

  await db
    .from("conversations")
    .update({ is_open: open })
    .eq("id", conversationId);

  revalidatePath(`/admin/conversations/${conversationId}`);
  revalidatePath("/admin/conversations");
}

/** Clears the staff badge once someone has actually opened the thread. */
export async function markStaffRead(conversationId: string) {
  const { db } = await requireOperations();
  await db
    .from("conversations")
    .update({ unread_for_staff: 0 })
    .eq("id", conversationId);
}
