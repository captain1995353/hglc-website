import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";

/** Centred card used by every auth screen. */
export function AuthShell({
  title,
  subtitle,
  children,
  footerText,
  footerHref,
  footerLink,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerText?: string;
  footerHref?: string;
  footerLink?: string;
}) {
  return (
    <div className="container-page flex justify-center py-16 sm:py-24">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <LogoMark className="mb-5 h-11 w-11" />
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>

        {footerText && footerHref && footerLink && (
          <p className="mt-5 text-center text-sm text-ink-500">
            {footerText}{" "}
            <Link href={footerHref} className="font-semibold text-brand-700 hover:underline">
              {footerLink}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
