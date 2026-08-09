"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { submitManualPayment } from "@/app/actions/payments";

/**
 * Submitting a payment takes a moment — a receipt has to upload. Left
 * enabled, the button reads as unresponsive and gets clicked again, which is
 * how a single payment turned into fifteen. Its own component because
 * useFormStatus only reports on the form above it.
 */
function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Sending…" : label}
    </button>
  );
}

type Channel = "bkash" | "nagad" | "bank" | "cash";

const CHANNELS: {
  value: Channel;
  label: string;
  /** What the student is telling us they did. */
  blurb: string;
  needsSender: boolean;
  needsReference: boolean;
  referenceLabel: string;
  referenceHint: string;
}[] = [
  {
    value: "bkash",
    label: "bKash",
    blurb: "Send Money from your own bKash account, then enter the TrxID.",
    needsSender: true,
    needsReference: true,
    referenceLabel: "Transaction ID (TrxID)",
    referenceHint: "The 10-character code in your bKash confirmation SMS.",
  },
  {
    value: "nagad",
    label: "Nagad",
    blurb: "Send Money from your own Nagad account, then enter the TrxID.",
    needsSender: true,
    needsReference: true,
    referenceLabel: "Transaction ID (TrxID)",
    referenceHint: "The code in your Nagad confirmation SMS.",
  },
  {
    value: "bank",
    label: "Bank transfer",
    blurb: "Transfer to our bank account, then enter the reference from your slip.",
    needsSender: false,
    needsReference: true,
    referenceLabel: "Bank reference number",
    referenceHint: "From your deposit slip or online banking confirmation.",
  },
  {
    value: "cash",
    label: "Cash at the centre",
    blurb:
      "Pay at the front desk. Tell us here and we will match it against the day's takings.",
    needsSender: false,
    needsReference: false,
    referenceLabel: "",
    referenceHint: "",
  },
];

/**
 * Which fields a student sees depends on how they paid: a cash payment has no
 * transaction ID to type, and a bank transfer does not come from a phone
 * number. Asking for either anyway is how forms get abandoned.
 */
export function ManualPaymentForm({
  enrollmentId,
  amountDue,
  submitLabel,
  available,
}: {
  enrollmentId: string;
  /** The course fee, prefilled so most students just leave it alone. */
  amountDue: number;
  submitLabel: string;
  /**
   * Which methods the centre can actually receive money through. A method
   * with no account behind it is not offered: asking a student for a bKash
   * transaction ID when no bKash number is published leaves them stuck with
   * a form they cannot complete.
   */
  available: Channel[];
}) {
  const options = CHANNELS.filter((c) => available.includes(c.value));
  const [channel, setChannel] = useState<Channel>(options[0]?.value ?? "cash");
  const active = options.find((c) => c.value === channel) ?? options[0];

  if (!active) return null;

  return (
    <form
      action={submitManualPayment}
      encType="multipart/form-data"
      className="mt-5 grid gap-4 sm:grid-cols-2"
    >
      <input type="hidden" name="enrollment_id" value={enrollmentId} />

      <div className="sm:col-span-2">
        <span className="field-label">How did you pay?</span>
        <div
          className={`grid gap-2 ${
            options.length > 2 ? "sm:grid-cols-4" : "sm:grid-cols-2"
          }`}
        >
          {options.map((option) => (
            <label key={option.value} className="cursor-pointer">
              <input
                type="radio"
                name="channel"
                value={option.value}
                checked={channel === option.value}
                onChange={() => setChannel(option.value)}
                className="peer sr-only"
              />
              <span className="block rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-center text-sm font-semibold text-ink-600 transition-colors peer-checked:border-brand-600 peer-checked:bg-brand-50 peer-checked:text-brand-700">
                {option.label}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-500">{active.blurb}</p>
      </div>

      <div className={active.needsSender || active.needsReference ? "" : "sm:col-span-2"}>
        <label className="field-label" htmlFor="amount">
          How much did you pay?
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
            ৳
          </span>
          <input
            id="amount"
            name="amount"
            type="number"
            min="1"
            step="1"
            required
            defaultValue={amountDue || ""}
            className="field-input pl-7"
          />
        </div>
        <p className="mt-1 text-xs text-ink-400">
          Change it if you paid part of the fee.
        </p>
      </div>

      {active.needsSender && (
        <div>
          <label className="field-label" htmlFor="sender_number">
            The number you sent from
          </label>
          <input
            id="sender_number"
            name="sender_number"
            required
            placeholder="01XXXXXXXXX"
            className="field-input"
          />
        </div>
      )}

      {active.needsReference && (
        <div className={active.needsSender ? "" : "sm:col-span-2"}>
          <label className="field-label" htmlFor="trx_id">
            {active.referenceLabel}
          </label>
          <input
            id="trx_id"
            name="trx_id"
            required
            className="field-input font-mono uppercase"
          />
          <p className="mt-1 text-xs text-ink-400">{active.referenceHint}</p>
        </div>
      )}

      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="receipt">
          {channel === "cash" ? "Photo of your money receipt" : "Receipt or screenshot"}
        </label>
        <input
          id="receipt"
          name="receipt"
          type="file"
          accept="image/*,application/pdf"
          className="field-input file:mr-3 file:rounded-md file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink-700"
        />
        <p className="mt-1 text-xs text-ink-400">
          {channel === "cash"
            ? "A photo of the receipt we gave you. Up to 5 MB."
            : "A photo of the confirmation SMS or the app receipt. Up to 5 MB."}{" "}
          Optional, but it gets your seat confirmed faster.
        </p>
      </div>

      <div className="sm:col-span-2">
        <SubmitButton label={submitLabel} />
        <p className="mt-2 text-xs text-ink-400">
          We check the payment against our records and activate your enrolment,
          usually within one working day.
        </p>
      </div>
    </form>
  );
}
