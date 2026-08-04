import Link from "next/link";
import { Logo } from "./Logo";
import { LocaleSwitch } from "./LocaleSwitch";
import { MobileNav, type NavLink } from "./MobileNav";
import { getI18n } from "@/lib/i18n";
import { getUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";
import { signOut } from "@/app/actions/auth";

function LogoutButton({ label, block = false }: { label: string; block?: boolean }) {
  return (
    <form action={signOut} className={block ? "w-full" : undefined}>
      <button
        type="submit"
        className={block ? "btn btn-outline w-full" : "btn btn-ghost text-sm"}
      >
        {label}
      </button>
    </form>
  );
}

export async function Navbar() {
  const { locale, t } = await getI18n();
  const user = await getUser();

  let isAdmin = false;
  if (user && supabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = Boolean(data?.is_admin);
  }

  const links: NavLink[] = [
    { href: "/courses", label: t.nav.courses },
    { href: "/about", label: t.nav.about },
    { href: "/contact", label: t.nav.contact },
  ];
  if (user) links.push({ href: "/dashboard", label: t.nav.dashboard });
  if (isAdmin) links.push({ href: "/admin", label: t.nav.admin });

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-paper/85 backdrop-blur">
      <div className="container-page flex h-[68px] items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LocaleSwitch locale={locale} />

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <LogoutButton label={t.nav.logout} />
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost text-sm">
                  {t.nav.login}
                </Link>
                <Link href="/signup" className="btn btn-primary text-sm">
                  {t.nav.signup}
                </Link>
              </>
            )}
          </div>

          <MobileNav
            links={links}
            signedIn={Boolean(user)}
            loginLabel={t.nav.login}
            signupLabel={t.nav.signup}
            logoutSlot={<LogoutButton label={t.nav.logout} block />}
          />
        </div>
      </div>
    </header>
  );
}
