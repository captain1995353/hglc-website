import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/app/actions/admin/guard";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, db } = await requireAdmin();

  // Counts that ride along in the sidebar so nothing waits unseen.
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

  const badges: Record<string, number> = {
    "/admin/payments": review.count ?? 0,
    "/admin/messages": messages.count ?? 0,
  };

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="grid gap-8 lg:grid-cols-[13rem_1fr] lg:items-start">
        <aside className="lg:sticky lg:top-24">
          <p className="mb-3 hidden text-xs font-semibold uppercase tracking-[0.14em] text-ink-400 lg:block">
            Dashboard
          </p>
          <AdminNav badges={badges} />

          <div className="mt-6 hidden border-t border-ink-100 pt-5 lg:block">
            <p className="text-xs text-ink-400">Signed in as</p>
            <p className="text-sm font-semibold text-ink-800">
              {profile.full_name || "Admin"}
            </p>
            <Link
              href="/"
              className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline"
            >
              View site →
            </Link>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
