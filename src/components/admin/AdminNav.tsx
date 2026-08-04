"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/courses", label: "Courses & batches" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/enrolments", label: "Enrolments" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/settings", label: "Site settings" },
];

export function AdminNav({ badges }: { badges: Record<string, number> }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        const badge = badges[link.href];

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-ink-900 text-white"
                : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
            }`}
          >
            {link.label}
            {badge ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold ${
                  active ? "bg-white/20 text-white" : "bg-coral-500 text-white"
                }`}
              >
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
