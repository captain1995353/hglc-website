import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/lib/i18n";

export const metadata: Metadata = { title: "Payment", robots: { index: false } };

type Status = "success" | "fail" | "cancel" | "pending";

export default async function PaymentResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; ref?: string }>;
}) {
  const { id } = await params;
  const { status: raw, ref } = await searchParams;
  const { t } = await getI18n();

  const status: Status =
    raw === "success" || raw === "fail" || raw === "cancel" || raw === "pending"
      ? raw
      : "fail";

  const copy: Record<Status, { title: string; body: string; tone: string; icon: string }> =
    {
      success: {
        title: t.checkout.successTitle,
        body: t.checkout.successBody,
        tone: "bg-brand-50 text-brand-700",
        icon: "✓",
      },
      pending: {
        title: t.checkout.manualSubmit,
        body: t.checkout.manualPending,
        tone: "bg-paper-dim text-ink-600",
        icon: "⏳",
      },
      cancel: {
        title: t.checkout.cancelTitle,
        body: t.checkout.cancelBody,
        tone: "bg-paper-dim text-ink-600",
        icon: "–",
      },
      fail: {
        title: t.checkout.failTitle,
        body: t.checkout.failBody,
        tone: "bg-coral-50 text-coral-700",
        icon: "!",
      },
    };

  const view = copy[status];

  return (
    <div className="container-page py-20">
      <div className="card mx-auto max-w-lg p-8 text-center">
        <span
          aria-hidden
          className={`mx-auto grid h-14 w-14 place-items-center rounded-full text-2xl font-bold ${view.tone}`}
        >
          {view.icon}
        </span>

        <h1 className="mt-5 text-2xl font-bold tracking-tight">{view.title}</h1>
        <p className="mt-3 text-ink-500">{view.body}</p>

        {ref && (
          <p className="mt-4 text-xs text-ink-400">
            {t.dashboard.reference}:{" "}
            <span className="font-mono font-semibold text-ink-700">{ref}</span>
          </p>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className="btn btn-primary">
            {t.checkout.goDashboard}
          </Link>
          {(status === "fail" || status === "cancel") && (
            <Link href={`/checkout/${id}`} className="btn btn-outline">
              {t.checkout.tryAgain}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
