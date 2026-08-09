"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/LogoMark";
import type { Role } from "@/app/actions/admin/guard";

type NavItem = {
  href: string;
  label: string;
  roles: Role[];
  icon: React.ReactNode;
  exact?: boolean;
};

/* Line icons at 18px, stroke 1.6 — quiet enough to sit under the labels. */
const icon = (path: React.ReactNode) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {path}
  </svg>
);

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        roles: ["admin", "staff"],
        exact: true,
        icon: icon(
          <>
            <rect x="3" y="3" width="7" height="9" rx="1.5" />
            <rect x="14" y="3" width="7" height="5" rx="1.5" />
            <rect x="14" y="12" width="7" height="9" rx="1.5" />
            <rect x="3" y="16" width="7" height="5" rx="1.5" />
          </>,
        ),
      },
      {
        href: "/admin/classes",
        label: "My classes",
        roles: ["teacher", "admin"],
        icon: icon(
          <>
            <path d="M4 5h16v11H4z" />
            <path d="M8 20h8" />
            <path d="M12 16v4" />
          </>,
        ),
      },
    ],
  },
  {
    title: "Students",
    items: [
      {
        href: "/admin/students",
        label: "Students",
        roles: ["admin", "staff"],
        icon: icon(
          <>
            <circle cx="9" cy="8" r="3.2" />
            <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
            <path d="M16 8.5a3 3 0 0 1 0 5" />
            <path d="M17.5 19a4.5 4.5 0 0 0-2-3.6" />
          </>,
        ),
      },
      {
        href: "/admin/enrolments",
        label: "Enrolments",
        roles: ["admin", "staff"],
        icon: icon(
          <>
            <path d="M6 3h9l5 5v13H6z" />
            <path d="M14 3v6h6" />
            <path d="M9.5 15.5l1.8 1.8 3.4-3.6" />
          </>,
        ),
      },
      {
        href: "/admin/payments",
        label: "Payments",
        roles: ["admin", "staff"],
        icon: icon(
          <>
            <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
            <path d="M2.5 10.5h19" />
          </>,
        ),
      },
      {
        href: "/admin/messages",
        label: "Messages",
        roles: ["admin", "staff"],
        icon: icon(
          <>
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <path d="M4 7l8 5.5L20 7" />
          </>,
        ),
      },
    ],
  },
  {
    title: "Setup",
    items: [
      {
        href: "/admin/courses",
        label: "Courses & batches",
        roles: ["admin"],
        icon: icon(
          <>
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
            <path d="M4 17.5h15" />
          </>,
        ),
      },
      {
        href: "/admin/admissions",
        label: "Admissions",
        roles: ["admin"],
        icon: icon(
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5l3 2" />
          </>,
        ),
      },
      {
        href: "/admin/staff",
        label: "Staff & teachers",
        roles: ["admin"],
        icon: icon(
          <>
            <circle cx="12" cy="7.5" r="3.2" />
            <path d="M5 20a7 7 0 0 1 14 0" />
          </>,
        ),
      },
      {
        href: "/admin/settings",
        label: "Site settings",
        roles: ["admin"],
        icon: icon(
          <>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1 2 2 0 1 1-4 0 1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 15a2 2 0 1 1 0-4 1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 4.6a2 2 0 1 1 4 0 1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 19.4 11a2 2 0 1 1 0 4z" />
          </>,
        ),
      },
    ],
  },
];

export function AdminSidebar({
  role,
  name,
  badges,
}: {
  role: Role;
  name: string;
  badges: Record<string, number>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const sections = SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);

  const nav = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-5">
        <LogoMark className="h-9 w-9" onDark />
        <span className="leading-none">
          <span className="block text-[0.95rem] font-bold uppercase tracking-[0.02em] text-white">
            Hangeul
          </span>
          <span className="mt-1 block text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-ink-400">
            {role} panel
          </span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        {sections.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="mb-2 px-2 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ink-500">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const badge = badges[item.href];

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-brand-600 text-white shadow-[0_6px_16px_-6px_rgba(76,87,171,0.9)]"
                          : "text-ink-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className={active ? "text-white" : "text-ink-400"}>
                        {item.icon}
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {badge ? (
                        <span className="rounded-full bg-coral-500 px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
                          {badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-xs text-ink-500">Signed in as</p>
        <p className="truncate text-sm font-semibold text-white">{name}</p>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: a fixed rail the content is inset against. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-ink-900 lg:flex">
        {nav}
      </aside>

      {/* Mobile: the same rail, as a drawer. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="grid h-10 w-10 place-items-center rounded-lg border border-ink-200 bg-white text-ink-700 lg:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M3 6h18M3 12h18M3 18h18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-950/60"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-ink-900">
            {nav}
          </div>
        </div>
      )}
    </>
  );
}
