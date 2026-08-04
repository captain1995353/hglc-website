"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";

export async function sendContactMessage(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();
  // Bots fill hidden fields; humans leave them alone.
  const honeypot = String(formData.get("website") || "");

  if (honeypot) redirect("/contact?sent=1");
  if (!supabaseConfigured) redirect("/contact?error=preview");
  if (!name || !email || !message) redirect("/contact?error=1");

  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_messages")
    .insert({ name, email, phone, subject, message });

  if (error) {
    console.error("sendContactMessage:", error.message);
    redirect("/contact?error=1");
  }

  redirect("/contact?sent=1");
}
