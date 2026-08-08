"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/app/actions/admin/guard";

type NavItem = {
  href: string;
  label: string;
  roles: Role[];
  exact?: boolean;
};

const LINKS: NavItem[] = [
  { href: "/admin", label: "Overview", roles: ["admin", "staff"], exact: true },
  { href: "/admin/classes", label: "My classes", roles: ["teacher", "admin"] },
  { href: "/admin/courses", label: "Courses & batches", roles: ["admin"] },
  { href: "/admin/students", label: "Students", roles: ["admin", "staff"] },
  { href: "/admin/enrolments", label: "Enrolments", roles: ["admin", "staff"] },
  { href: "/admin/payments", label: "Payments", roles: ["admin", "staff"] },
  { href: "/admin/messages", label: "Messages", roles: ["admin", "staff"] },
  { href: "/admin/staff", label: "Staff & teachers", roles: ["admin"] },
  { href: "/admin/settings", label: "Site settings", roles: ["admin"] },
];

export function AdminNav({
  role,
  badges,
}: {
  role: Role;
  badges: Record<string, number>;
}) {
  const pathname = usePathname();
  const visible = LINKS.filter((link) => link.roles.includes(role));

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
      {visible.map((link) => {
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
