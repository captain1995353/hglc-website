import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getI18n, pick } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/format";
import { manualPaymentAccounts, site } from "@/lib/site";
import { getSettings, setting } from "@/lib/settings";
import { stripeEnabled } from "@/lib/payments/stripe";
import { sslcommerzConfigured } from "@/lib/env";
import { startSslPayment, startStripePayment } from "@/app/actions/payments";
import { ManualPaymentForm } from "@/components/ManualPaymentForm";
import type { Batch, Course } from "@/lib/types";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { locale, t } = await getI18n();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/checkout/${id}`);

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select(
      `id, status, user_id,
       course:courses (id, slug, title_en, title_ko, price_bdt, price_usd, level),
       batch:batches (id, name, mode, start_date, schedule_text)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!enrollment || enrollment.user_id !== user.id) redirect("/dashboard");

  const course = (
    Array.isArray(enrollment.course) ? enrollment.course[0] : enrollment.course
  ) as Pick<
    Course,
    "id" | "slug" | "title_en" | "title_ko" | "price_bdt" | "price_usd" | "level"
  >;
  const batch = (
    Array.isArray(enrollment.batch) ? enrollment.batch[0] : enrollment.batch
  ) as Pick<Batch, "id" | "name" | "mode" | "start_date" | "schedule_text"> | null;

  if (enrollment.status !== "pending_payment") {
    return (
      <div className="container-page py-20">
        <div className="card mx-auto max-w-lg p-8 text-center">
          <p className="text-ink-600">{t.checkout.alreadyPaid}</p>
          <Link href="/dashboard" className="btn btn-primary mt-6">
            {t.checkout.goDashboard}
          </Link>
        </div>
      </div>
    );
  }

  // A manual transfer already awaiting review blocks further attempts.
  const { data: pendingManual } = await supabase
    .from("payments")
    .select("id, provider_ref")
    .eq("enrollment_id", id)
    .eq("status", "pending_review")
    .maybeSingle();

  const priceBdt = Number(course.price_bdt);
  const priceUsd = Number(course.price_usd);
  const sslConfigured = sslcommerzConfigured;
  // Stripe is pointless without a dollar price to charge.
  const stripeReady = stripeEnabled() && priceUsd > 0;

  // Payment account numbers are managed from the dashboard; the env vars
  // stay as a fallback for a fresh install.
  const settings = await getSettings();
  const accounts = {
    bkash: setting(settings, "bkash_number", locale, manualPaymentAccounts.bkash),
    nagad: setting(settings, "nagad_number", locale, manualPaymentAccounts.nagad),
    bank: setting(settings, "bank_details", locale, manualPaymentAccounts.bank),
  };
  const paymentNote = setting(settings, "payment_note", locale, t.checkout.manualBody);
  const hasAccounts = Boolean(accounts.bkash || accounts.nagad || accounts.bank);

  // Cash needs no account details; the rest need somewhere to send money.
  const availableChannels = [
    ...(accounts.bkash ? (["bkash"] as const) : []),
    ...(accounts.nagad ? (["nagad"] as const) : []),
    ...(accounts.bank ? (["bank"] as const) : []),
    "cash" as const,
  ];
  const address = setting(settings, "address", locale, site.address[locale]);
  const openingHours = setting(settings, "opening_hours", locale, site.hours[locale]);

  return (
    <div className="container-page py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight">{t.checkout.title}</h1>

      {error && (
        <p className="mt-5 rounded-lg bg-coral-50 px-4 py-3 text-sm text-coral-700">
          {error === "duplicate_trx"
            ? "That transaction ID has already been submitted."
            : error === "receipt_type"
              ? "The receipt has to be an image or a PDF."
              : error === "receipt_size"
                ? "That file is larger than 5 MB — try a screenshot instead."
                : error === "receipt_failed"
                  ? "The receipt could not be uploaded. Try again, or submit without it."
                  : error === "missing"
                    ? "Enter the transaction ID and the number you sent from."
                    : t.common.error}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
        {/* ---------------- Payment methods ---------------- */}
        <div className="order-2 lg:order-1">
          {pendingManual ? (
            <div className="card p-6">
              <p className="text-sm leading-relaxed text-ink-600">
                {t.checkout.manualPending}
              </p>
              <p className="mt-3 text-sm text-ink-400">
                {t.dashboard.reference}:{" "}
                <span className="font-mono font-semibold text-ink-800">
                  {pendingManual.provider_ref}
                </span>
              </p>
              <Link href="/dashboard" className="btn btn-outline mt-5">
                {t.checkout.goDashboard}
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-400">
                {sslConfigured || stripeReady
                  ? t.checkout.chooseMethod
                  : "How to pay"}
              </h2>

              <div className="mt-4 space-y-4">
                {/* --- SSLCommerz. Hidden entirely until credentials exist:
                     a student has no use for our configuration state. --- */}
                {sslConfigured && (
                <section className="card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-md">
                      <h3 className="text-base font-bold text-ink-900">
                        {t.checkout.sslTitle}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
                        {t.checkout.sslBody}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {["bKash", "Nagad", "Rocket", "Visa", "Mastercard"].map((m) => (
                          <span key={m} className="badge bg-ink-100 text-ink-600">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                    <form action={startSslPayment}>
                      <input type="hidden" name="enrollment_id" value={id} />
                      <button
                        type="submit"
                        className="btn btn-primary whitespace-nowrap"
                      >
                        {t.checkout.sslButton} {formatMoney(priceBdt, "BDT", locale)}
                      </button>
                    </form>
                  </div>
                </section>
                )}

                {/* --- Stripe. Also needs a USD price to be worth showing. --- */}
                {stripeReady && (
                <section className="card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-md">
                      <h3 className="text-base font-bold text-ink-900">
                        {t.checkout.stripeTitle}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
                        {t.checkout.stripeBody}
                      </p>
                    </div>
                    <form action={startStripePayment}>
                      <input type="hidden" name="enrollment_id" value={id} />
                      <button
                        type="submit"
                        className="btn btn-outline whitespace-nowrap"
                      >
                        {t.checkout.stripeButton} {formatMoney(priceUsd, "USD", locale)}
                      </button>
                    </form>
                  </div>
                </section>
                )}

                {/* --- Manual transfer --- */}
                <section className="card p-6">
                  <h3 className="text-base font-bold text-ink-900">
                    {t.checkout.manualTitle}
                  </h3>
                  <p className="mt-1.5 max-w-lg whitespace-pre-line text-sm leading-relaxed text-ink-500">
                    {paymentNote}
                  </p>

                  <div className="mt-4 rounded-lg border border-ink-200 bg-white p-4 text-sm">
                    <p className="text-xs uppercase tracking-wide text-ink-400">
                      Paying cash at the centre
                    </p>
                    <p className="mt-1 whitespace-pre-line text-ink-800">{address}</p>
                    <p className="mt-1 text-xs text-ink-500">{openingHours}</p>
                  </div>

                  {hasAccounts && (
                  <dl className="mt-4 grid gap-2 rounded-lg bg-paper-dim p-4 text-sm sm:grid-cols-2">
                    {accounts.bkash && (
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-ink-400">
                          {t.checkout.manualBkash}
                        </dt>
                        <dd className="font-mono font-semibold text-ink-900">
                          {accounts.bkash}
                        </dd>
                      </div>
                    )}
                    {accounts.nagad && (
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-ink-400">
                          {t.checkout.manualNagad}
                        </dt>
                        <dd className="font-mono font-semibold text-ink-900">
                          {accounts.nagad}
                        </dd>
                      </div>
                    )}
                    {accounts.bank && (
                      <div className="sm:col-span-2">
                        <dt className="text-xs uppercase tracking-wide text-ink-400">
                          {t.checkout.manualBank}
                        </dt>
                        <dd className="whitespace-pre-line text-ink-800">
                          {accounts.bank}
                        </dd>
                      </div>
                    )}
                  </dl>
                  )}

                  <ManualPaymentForm
                    enrollmentId={id}
                    amountDue={priceBdt}
                    submitLabel={t.checkout.manualSubmit}
                    available={[...availableChannels]}
                  />
                </section>
              </div>
            </>
          )}
        </div>

        {/* ---------------- Order summary ---------------- */}
        <aside className="card order-1 p-6 lg:order-2 lg:sticky lg:top-24">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-400">
            {t.checkout.summary}
          </h2>

          <div className="mt-5 space-y-4 text-sm">
            <div>
              <p className="text-ink-400">{t.checkout.course}</p>
              <p className="font-semibold text-ink-900">
                {pick(course, "title", locale)}
              </p>
              <p className="text-xs text-ink-400">{course.level}</p>
            </div>

            {batch && (
              <div>
                <p className="text-ink-400">{t.checkout.batch}</p>
                <p className="font-semibold text-ink-900">{batch.name}</p>
                <p className="text-xs text-ink-400">
                  {formatDate(batch.start_date, locale)} · {batch.schedule_text}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-baseline justify-between border-t border-ink-100 pt-5">
            <span className="text-sm text-ink-400">{t.checkout.total}</span>
            <span className="text-2xl font-bold text-ink-900">
              {formatMoney(priceBdt, "BDT", locale)}
            </span>
          </div>
          <p className="mt-1 text-right text-xs text-ink-400">
            {formatMoney(priceUsd, "USD", locale)}
          </p>
        </aside>
      </div>
    </div>
  );
}
