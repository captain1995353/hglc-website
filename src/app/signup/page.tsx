import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n";
import { getUser } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";
import { supabaseConfigured } from "@/lib/env";
import { PreviewAuthNotice } from "@/components/auth/PreviewAuthNotice";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage({
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
      title={t.auth.signupTitle}
      subtitle={t.auth.signupSubtitle}
      footerText={t.auth.haveAccount}
      footerHref={`/login?next=${encodeURIComponent(target)}`}
      footerLink={t.auth.login}
    >
      {supabaseConfigured ? <SignupForm t={t} next={target} /> : <PreviewAuthNotice />}
    </AuthShell>
  );
}
