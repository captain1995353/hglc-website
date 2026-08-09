"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminDictionary } from "@/lib/i18n/admin";

const TABS: { slug: string; label: (t: AdminDictionary) => string }[] = [
  { slug: "", label: (t) => t.classes.tabs.overview },
  { slug: "attendance", label: (t) => t.classes.tabs.attendance },
  { slug: "assignments", label: (t) => t.classes.tabs.assignments },
  { slug: "groups", label: (t) => t.classes.tabs.groups },
  { slug: "report", label: (t) => t.classes.tabs.report },
];

export function ClassTabs({
  batchId,
  t,
}: {
  batchId: string;
  t: AdminDictionary;
}) {
  const pathname = usePathname();
  const base = `/admin/classes/${batchId}`;

  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-ink-100">
      {TABS.map((tab) => {
        const href = tab.slug ? `${base}/${tab.slug}` : base;
        const active = tab.slug
          ? pathname.startsWith(href)
          : pathname === base;

        return (
          <Link
            key={tab.slug || "overview"}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              active
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-ink-500 hover:border-ink-200 hover:text-ink-800"
            }`}
          >
            {tab.label(t)}
          </Link>
        );
      })}
    </nav>
  );
}
