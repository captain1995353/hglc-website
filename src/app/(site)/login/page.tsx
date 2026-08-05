import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n";
import { getUser } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { supabaseConfigured } from "@/lib/env";
import { PreviewAuthNotice } from "@/components/auth/PreviewAuthNotice";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { t } = await getI18n();
  const { next } = await searchParams;
  const target = next?.startsWith("/") ? next : "/dashboard";

  if (await getUser()) redirect(target);

  return (
    <AuthShell
      title={t.auth.loginTitle}
      subtitle={t.auth.loginSubtitle}
      footerText={t.auth.noAccount}
      footerHref={`/signup?next=${encodeURIComponent(target)}`}
      footerLink={t.auth.signup}
    >
      {supabaseConfigured ? <LoginForm t={t} next={target} /> : <PreviewAuthNotice />}
    </AuthShell>
  );
}
