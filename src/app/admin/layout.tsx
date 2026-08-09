import type { Metadata } from "next";
import Link from "next/link";
import { requireRole, ROLE_LABELS } from "@/app/actions/admin/guard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
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

  const name = profile.full_name || ROLE_LABELS[role];
  const initials =
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part: string) => part[0])
      .join("")
      .toUpperCase() || "A";

  return (
    <div className="min-h-screen bg-paper-dim">
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-5 sm:px-8">
            <div className="flex items-center gap-3">
              {/* Renders the fixed rail on desktop and the drawer button
                  here on mobile — `fixed` ignores where it sits in the DOM. */}
              <AdminSidebar role={role} name={name} badges={badges} />
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-ink-900">
                  {ROLE_LABELS[role]} dashboard
                </p>
                <p className="text-xs text-ink-400">
                  Hangeul Global Learning Center
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                target="_blank"
                className="hidden text-sm font-medium text-ink-500 hover:text-ink-900 sm:inline"
              >
                View site ↗
              </Link>

              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
                >
                  Sign out
                </button>
              </form>

              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white"
                title={name}
              >
                {initials}
              </span>
            </div>
          </div>
        </header>

        <main className="px-5 py-8 sm:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
