import type { Metadata } from "next";
import Link from "next/link";
import { requireRole, ROLE_LABELS } from "@/app/actions/admin/guard";
import { AdminNav } from "@/components/admin/AdminNav";
import { LogoMark } from "@/components/LogoMark";
import { signOut } from "@/app/actions/auth";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/**
 * Never prerender any admin route. Without this, a build that runs without
 * Supabase credentials can snapshot these pages as static HTML, and the
 * signed-in check would stop running per request.
 */
export const dynamic = "force-dynamic";

/**
 * The dashboard is a separate application shell: its own header, its own
 * navigation, no public site chrome. Nothing on the public site links here.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, role, db } = await requireRole();

  // Counts that ride along in the sidebar so nothing waits unseen. Teachers
  // do not see those screens, so the queries are skipped for them.
  const badges: Record<string, number> = {};

  if (role === "admin" || role === "staff") {
    const [review, messages] = await Promise.all([
      db
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_review"),
      db
        .from("contact_messages")
        .select("id", { count: "exact", head: true })
        .eq("handled", false),
    ]);

    badges["/admin/payments"] = review.count ?? 0;
    badges["/admin/messages"] = messages.count ?? 0;
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-ink-800 bg-ink-900 text-white">
        <div className="container-page flex h-[60px] items-center justify-between gap-4">
          <Link href="/admin" className="flex items-center gap-2.5">
            <LogoMark className="h-8 w-8" onDark />
            <span className="leading-tight">
              <span className="block text-sm font-bold uppercase tracking-[0.02em]">
                Hangeul
              </span>
              <span className="block text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-ink-300">
                {ROLE_LABELS[role]} dashboard
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-ink-300 sm:inline">
              {profile.full_name || ROLE_LABELS[role]}
            </span>
            <Link
              href="/"
              target="_blank"
              className="text-sm font-medium text-ink-200 hover:text-white"
            >
              View site ↗
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="container-page flex-1 py-8">
        <div className="grid gap-8 lg:grid-cols-[13rem_1fr] lg:items-start">
          <aside className="lg:sticky lg:top-[76px]">
            <AdminNav role={role} badges={badges} />
          </aside>

          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </>
  );
}
