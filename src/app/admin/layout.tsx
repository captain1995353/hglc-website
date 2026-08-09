import type { Metadata } from "next";
import { requireRole, ROLE_LABELS } from "@/app/actions/admin/guard";
import { AdminChrome } from "@/components/admin/AdminChrome";
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

  // Counts that ride along in the rail so nothing waits unseen. Teachers do
  // not see those screens, so the queries are skipped for them.
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
    <AdminChrome
      role={role}
      roleLabel={ROLE_LABELS[role]}
      name={profile.full_name || ROLE_LABELS[role]}
      badges={badges}
      signOut={
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
          >
            Sign out
          </button>
        </form>
      }
    >
      {children}
    </AdminChrome>
  );
}
