"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export type NavLink = { href: string; label: string };

export function MobileNav({
  links,
  signedIn,
  loginLabel,
  signupLabel,
  logoutSlot,
}: {
  links: NavLink[];
  signedIn: boolean;
  loginLabel: string;
  signupLabel: string;
  logoutSlot: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the sheet on navigation.
  useEffect(() => setOpen(false), [pathname]);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Menu"
        className="grid h-10 w-10 place-items-center rounded-lg border border-ink-200 bg-white text-ink-700"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          {open ? (
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M3 6h18M3 12h18M3 18h18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>

      {open && (
        <div className="fixed inset-x-0 top-[68px] bottom-0 z-40 overflow-y-auto border-t border-ink-100 bg-paper px-5 py-6">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-3 text-base font-medium text-ink-800 hover:bg-ink-100"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-6 flex flex-col gap-2 border-t border-ink-100 pt-6">
            {signedIn ? (
              logoutSlot
            ) : (
              <>
                <Link href="/login" className="btn btn-outline w-full">
                  {loginLabel}
                </Link>
                <Link href="/signup" className="btn btn-primary w-full">
                  {signupLabel}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
