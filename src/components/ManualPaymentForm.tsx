"use client";

import { useState } from "react";
import { submitManualPayment } from "@/app/actions/payments";

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
  submitLabel,
}: {
  enrollmentId: string;
  submitLabel: string;
}) {
  const [channel, setChannel] = useState<Channel>("bkash");
  const active = CHANNELS.find((c) => c.value === channel)!;

  return (
    <form
      action={submitManualPayment}
      encType="multipart/form-data"
      className="mt-5 grid gap-4 sm:grid-cols-2"
    >
      <input type="hidden" name="enrollment_id" value={enrollmentId} />

      <div className="sm:col-span-2">
        <span className="field-label">How did you pay?</span>
        <div className="grid gap-2 sm:grid-cols-4">
          {CHANNELS.map((option) => (
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

      {channel === "cash" && (
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="note">
            Who did you pay, and when?
          </label>
          <input
            id="note"
            name="note"
            placeholder="Paid at the desk on Sunday morning"
            className="field-input"
          />
          <p className="mt-1 text-xs text-ink-400">
            Optional, but it helps us find your payment faster.
          </p>
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
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
        <p className="mt-2 text-xs text-ink-400">
          We check the payment against our records and activate your enrolment,
          usually within one working day.
        </p>
      </div>
    </form>
  );
}
