"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/LogoMark";
import type { Role } from "@/app/actions/admin/guard";
import type { AdminDictionary } from "@/lib/i18n/admin";

/**
 * The dashboard frame: fixed rail, top bar, content well.
 *
 * Rail and toggle live in one component because they share the drawer state,
 * and — the reason this is not two components — the rail must not be nested
 * inside the header. The header uses backdrop-blur, and a backdrop-filter
 * makes an element the containing block for its fixed-position descendants,
 * which clips the rail into the header's own 64px box.
 */

type NavItem = {
  href: string;
  /** Picks the label out of the dictionary, so it follows the language. */
  label: (t: AdminDictionary) => string;
  roles: Role[];
  icon: React.ReactNode;
  exact?: boolean;
};

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

const SECTIONS: {
  title: (t: AdminDictionary) => string;
  items: NavItem[];
}[] = [
  {
    title: (t) => t.nav.overview,
    items: [
      {
        href: "/admin",
        label: (t) => t.nav.dashboard,
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
        // Teachers only. An admin does not have "my" classes — they oversee
        // all of them, which is what /admin/attendance is for.
        href: "/admin/classes",
        label: (t) => t.nav.myClasses,
        roles: ["teacher"],
        icon: icon(
          <>
            <path d="M4 5h16v11H4z" />
            <path d="M8 20h8" />
            <path d="M12 16v4" />
          </>,
        ),
      },
      {
        href: "/admin/attendance",
        label: (t) => t.nav.attendance,
        roles: ["admin"],
        icon: icon(
          <>
            <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
            <path d="M3.5 9h17" />
            <path d="M8 3v3" />
            <path d="M16 3v3" />
            <path d="M8.5 13.8l2 2 4-4.2" />
          </>,
        ),
      },
    ],
  },
  {
    title: (t) => t.nav.students,
    items: [
      {
        href: "/admin/students",
        label: (t) => t.nav.studentList,
        roles: ["admin", "staff"],
        icon: icon(
          <>
            <circle cx="9" cy="8" r="3.2" />
            <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
            <path d="M16 8.5a3 3 0 0 1 0 5" />
          </>,
        ),
      },
      {
        href: "/admin/enrolments",
        label: (t) => t.nav.enrolments,
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
        label: (t) => t.nav.payments,
        roles: ["admin", "staff"],
        icon: icon(
          <>
            <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
            <path d="M2.5 10.5h19" />
          </>,
        ),
      },
      {
        href: "/admin/conversations",
        label: (t) => t.nav.studentMessages,
        roles: ["admin", "staff"],
        icon: icon(
          <>
            <path d="M21 11.5a8.4 8.4 0 0 1-9 8.3 9 9 0 0 1-3.4-.6L3 21l1.9-5.1A8.2 8.2 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z" />
          </>,
        ),
      },
      {
        href: "/admin/messages",
        label: (t) => t.nav.enquiries,
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
    title: (t) => t.nav.setup,
    items: [
      {
        href: "/admin/courses",
        label: (t) => t.nav.courses,
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
        label: (t) => t.nav.admissions,
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
        label: (t) => t.nav.staff,
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
        label: (t) => t.nav.settings,
        roles: ["admin"],
        icon: icon(
          <>
            <circle cx="12" cy="12" r="3" />
            <path d="M20 12a8 8 0 0 0-.14-1.5l2-1.55-2-3.46-2.36.95a8 8 0 0 0-2.6-1.5L14.5 2h-4l-.4 2.94a8 8 0 0 0-2.6 1.5L5.14 5.5l-2 3.46 2 1.55A8 8 0 0 0 5 12a8 8 0 0 0 .14 1.5l-2 1.55 2 3.46 2.36-.95a8 8 0 0 0 2.6 1.5l.4 2.94h4l.4-2.94a8 8 0 0 0 2.6-1.5l2.36.95 2-3.46-2-1.55A8 8 0 0 0 20 12z" />
          </>,
        ),
      },
    ],
  },
];

export function AdminChrome({
  role,
  roleLabel,
  name,
  badges,
  t,
  signOut,
  languageSwitch,
  children,
}: {
  role: Role;
  roleLabel: string;
  name: string;
  badges: Record<string, number>;
  t: AdminDictionary;
  /** Rendered on the server so their actions stay server-side. */
  signOut: React.ReactNode;
  languageSwitch: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const sections = SECTIONS.map((section) => ({
    title: section.title(t),
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);

  const initials =
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part: string) => part[0])
      .join("")
      .toUpperCase() || "A";

  const rail = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <LogoMark className="h-9 w-9" onDark />
        <span className="leading-none">
          <span className="block text-[0.95rem] font-bold uppercase tracking-[0.02em] text-white">
            Hangeul
          </span>
          <span className="mt-1 block text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-ink-400">
            {roleLabel} {t.chrome.panel}
          </span>
        </span>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
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
                          ? "bg-brand-600 text-white"
                          : "text-ink-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className={active ? "text-white" : "text-ink-400"}>
                        {item.icon}
                      </span>
                      <span className="flex-1">{item.label(t)}</span>
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

      <div className="shrink-0 border-t border-white/10 px-5 py-4">
        <p className="text-xs text-ink-500">{t.chrome.signedInAs}</p>
        <p className="truncate text-sm font-semibold text-white">{name}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper-dim">
      {/* Desktop rail — a direct child of the page, never inside the header. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-ink-900 lg:block">
        {rail}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t.chrome.closeMenu}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-950/60"
          />
          <div className="absolute inset-y-0 left-0 w-64 bg-ink-900">{rail}</div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-ink-100 bg-white">
          <div className="flex h-16 items-center justify-between gap-4 px-5 sm:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={t.chrome.openMenu}
                className="grid h-10 w-10 place-items-center rounded-lg border border-ink-200 text-ink-700 lg:hidden"
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

              <div>
                <p className="text-sm font-semibold text-ink-900">
                  {roleLabel} {t.chrome.dashboard}
                </p>
                <p className="hidden text-xs text-ink-400 sm:block">
                  {t.chrome.centre}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                target="_blank"
                className="hidden text-sm font-medium text-ink-500 hover:text-ink-900 sm:inline"
              >
                {t.chrome.viewSite} ↗
              </Link>
              {languageSwitch}
              {signOut}
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
