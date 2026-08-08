import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";

/**
 * Root 404. Self-contained rather than wrapped in the public site chrome,
 * because unmatched URLs sit outside the (site) route group.
 */
export default function NotFound() {
  return (
    <div className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
      <LogoMark className="h-12 w-12" />
      <p className="mt-8 text-6xl font-bold text-ink-200">404</p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-900">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-ink-500">
        That address does not exist. It may have moved, or the link you followed
        was mistyped.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary">
          Home
        </Link>
        <Link href="/courses" className="btn btn-outline">
          Courses
        </Link>
        <Link href="/contact" className="btn btn-outline">
          Contact
        </Link>
      </div>
    </div>
  );
}
