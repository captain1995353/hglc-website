import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { LogoMark } from "@/components/LogoMark";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Staff sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Staff sign-in. Deliberately outside the /admin layout — that layout demands
 * an admin session, which nobody has before signing in. Its own route group
 * keeps the dashboard chrome off this page.
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = next?.startsWith("/admin") ? next : "/admin";

  if (supabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.is_admin) redirect(target);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <LogoMark className="mx-auto h-14 w-14" onDark />
          <h1 className="mt-5 text-xl font-bold text-white">Staff sign in</h1>
          <p className="mt-1 text-sm text-ink-300">
            Hangeul Global Learning Center — admin dashboard
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7">
          <AdminLoginForm next={target} />
        </div>

        <p className="mt-6 text-center text-xs text-ink-400">
          Are you a student?{" "}
          <Link href="/login" className="font-semibold text-ink-200 hover:text-white">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
