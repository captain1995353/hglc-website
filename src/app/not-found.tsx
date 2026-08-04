import Link from "next/link";
import { getI18n } from "@/lib/i18n";

export default async function NotFound() {
  const { t } = await getI18n();

  return (
    <div className="container-page py-24 text-center">
      <p className="text-6xl font-bold text-ink-200">404</p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">
        {t.courses.empty}
      </h1>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="btn btn-primary">
          {t.nav.home}
        </Link>
        <Link href="/courses" className="btn btn-outline">
          {t.nav.courses}
        </Link>
      </div>
    </div>
  );
}
