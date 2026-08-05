import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ResetForms";
import { supabaseConfigured } from "@/lib/env";
import { PreviewAuthNotice } from "@/components/auth/PreviewAuthNotice";

export const metadata: Metadata = { title: "Reset your password" };

export default async function ForgotPasswordPage() {
  const { t } = await getI18n();

  return (
    <AuthShell
      title={t.auth.resetTitle}
      subtitle="We will email you a 6-digit code to confirm it is you."
      footerText={t.auth.haveAccount}
      footerHref="/login"
      footerLink={t.auth.login}
    >
      {supabaseConfigured ? <ForgotPasswordForm t={t} /> : <PreviewAuthNotice />}
    </AuthShell>
  );
}
