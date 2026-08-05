import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n";
import { getUser } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { NewPasswordForm } from "@/components/auth/ResetForms";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage() {
  const { t } = await getI18n();

  // Reached with a live recovery session from the emailed link.
  if (!(await getUser())) redirect("/forgot-password");

  return (
    <AuthShell title={t.auth.resetTitle} subtitle={t.auth.passwordHint}>
      <NewPasswordForm t={t} />
    </AuthShell>
  );
}
