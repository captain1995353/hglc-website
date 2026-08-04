import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getI18n, pick } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/format";
import { manualPaymentAccounts } from "@/lib/site";
import { stripeEnabled } from "@/lib/payments/stripe";
import { sslcommerzConfigured } from "@/lib/env";
import {
  startSslPayment,
  startStripePayment,
  submitManualPayment,
} from "@/app/actions/payments";
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

  return (
    <div className="container-page py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight">{t.checkout.title}</h1>

      {error && (
        <p className="mt-5 rounded-lg bg-coral-50 px-4 py-3 text-sm text-coral-700">
          {error === "duplicate_trx"
            ? "That transaction ID has already been submitted."
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
                {t.checkout.chooseMethod}
              </h2>

              <div className="mt-4 space-y-4">
                {/* --- SSLCommerz --- */}
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
                        disabled={!sslConfigured}
                        className="btn btn-primary whitespace-nowrap"
                      >
                        {t.checkout.sslButton} {formatMoney(priceBdt, "BDT", locale)}
                      </button>
                    </form>
                  </div>
                  {!sslConfigured && (
                    <p className="mt-3 text-xs text-coral-500">
                      SSLCommerz credentials are not configured yet.
                    </p>
                  )}
                </section>

                {/* --- Stripe --- */}
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
                        disabled={!stripeEnabled()}
                        className="btn btn-outline whitespace-nowrap"
                      >
                        {t.checkout.stripeButton} {formatMoney(priceUsd, "USD", locale)}
                      </button>
                    </form>
                  </div>
                  {!stripeEnabled() && (
                    <p className="mt-3 text-xs text-coral-500">
                      Stripe is not configured yet.
                    </p>
                  )}
                </section>

                {/* --- Manual transfer --- */}
                <section className="card p-6">
                  <h3 className="text-base font-bold text-ink-900">
                    {t.checkout.manualTitle}
                  </h3>
                  <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-ink-500">
                    {t.checkout.manualBody}
                  </p>

                  <dl className="mt-4 grid gap-2 rounded-lg bg-paper-dim p-4 text-sm sm:grid-cols-2">
                    {manualPaymentAccounts.bkash && (
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-ink-400">
                          {t.checkout.manualBkash}
                        </dt>
                        <dd className="font-mono font-semibold text-ink-900">
                          {manualPaymentAccounts.bkash}
                        </dd>
                      </div>
                    )}
                    {manualPaymentAccounts.nagad && (
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-ink-400">
                          {t.checkout.manualNagad}
                        </dt>
                        <dd className="font-mono font-semibold text-ink-900">
                          {manualPaymentAccounts.nagad}
                        </dd>
                      </div>
                    )}
                    {manualPaymentAccounts.bank && (
                      <div className="sm:col-span-2">
                        <dt className="text-xs uppercase tracking-wide text-ink-400">
                          {t.checkout.manualBank}
                        </dt>
                        <dd className="text-ink-800">{manualPaymentAccounts.bank}</dd>
                      </div>
                    )}
                  </dl>

                  <form action={submitManualPayment} className="mt-5 grid gap-4 sm:grid-cols-2">
                    <input type="hidden" name="enrollment_id" value={id} />

                    <div>
                      <label className="field-label" htmlFor="channel">
                        {t.dashboard.method}
                      </label>
                      <select id="channel" name="channel" className="field-input">
                        <option value="bkash">bKash</option>
                        <option value="nagad">Nagad</option>
                        <option value="bank">Bank</option>
                      </select>
                    </div>

                    <div>
                      <label className="field-label" htmlFor="sender_number">
                        {t.checkout.manualSender}
                      </label>
                      <input
                        id="sender_number"
                        name="sender_number"
                        required
                        placeholder="01XXXXXXXXX"
                        className="field-input"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="field-label" htmlFor="trx_id">
                        {t.checkout.manualTrxId}
                      </label>
                      <input
                        id="trx_id"
                        name="trx_id"
                        required
                        className="field-input font-mono uppercase"
                      />
                      <p className="mt-1 text-xs text-ink-400">
                        {t.checkout.manualTrxIdHint}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <button type="submit" className="btn btn-outline">
                        {t.checkout.manualSubmit}
                      </button>
                    </div>
                  </form>
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
