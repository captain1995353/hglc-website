import "server-only";

import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { site, siteUrl } from "@/lib/site";

/**
 * Transactional email — receipts, refunds. Separate from Supabase's auth
 * mailer, which only sends sign-in and confirmation messages.
 *
 * Every send is logged and never throws: a student not getting an email must
 * not stop their payment being confirmed.
 */

export const mailConfigured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
);

function transport() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function log(entry: {
  to: string;
  subject: string;
  kind: string;
  paymentId?: string | null;
  ok: boolean;
  error?: string;
}) {
  try {
    await createAdminClient().from("email_log").insert({
      to_email: entry.to,
      subject: entry.subject,
      kind: entry.kind,
      payment_id: entry.paymentId ?? null,
      ok: entry.ok,
      error: entry.error ?? null,
    });
  } catch {
    // The log is a convenience; losing a row must not break a send.
  }
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  kind?: string;
  paymentId?: string | null;
}): Promise<{ ok: boolean; reason?: string }> {
  const { to, subject, html, kind = "general", paymentId } = options;

  if (!to) return { ok: false, reason: "no recipient" };

  if (!mailConfigured) {
    await log({ to, subject, kind, paymentId, ok: false, error: "SMTP not configured" });
    return { ok: false, reason: "SMTP not configured" };
  }

  try {
    await transport().sendMail({
      from: `"${site.name}" <${process.env.MAIL_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    await log({ to, subject, kind, paymentId, ok: true });
    return { ok: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "send failed";
    console.error("sendMail:", reason);
    await log({ to, subject, kind, paymentId, ok: false, error: reason });
    return { ok: false, reason };
  }
}

// ---------------------------------------------------------------------
// Templates
//
// Plain tables and inline styles, because email clients discard stylesheets.
// ---------------------------------------------------------------------

function shell(heading: string, body: string) {
  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1b2547">
  <div style="background:#1b2547;padding:20px 24px;border-radius:12px 12px 0 0">
    <p style="margin:0;color:#fff;font-size:18px;font-weight:bold;letter-spacing:.5px">
      HANGEUL
    </p>
    <p style="margin:2px 0 0;color:#a1a9cd;font-size:11px;letter-spacing:2px;text-transform:uppercase">
      Global Learning Center
    </p>
  </div>
  <div style="border:1px solid #e5e8f2;border-top:0;border-radius:0 0 12px 12px;padding:24px">
    <h1 style="margin:0 0 16px;font-size:20px">${heading}</h1>
    ${body}
    <hr style="border:0;border-top:1px solid #e5e8f2;margin:24px 0" />
    <p style="margin:0;font-size:12px;color:#7580ac">
      ${site.name}<br />
      <a href="${siteUrl}" style="color:#414b96">${siteUrl.replace(/^https?:\/\//, "")}</a>
    </p>
  </div>
</div>`;
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:6px 0;color:#7580ac;font-size:14px">${label}</td>
    <td style="padding:6px 0;text-align:right;font-weight:bold;font-size:14px">${value}</td>
  </tr>`;
}

export function paymentApprovedEmail(details: {
  name: string;
  invoiceNo: string;
  course: string;
  batch: string;
  amount: string;
  method: string;
  paidOn: string;
  invoiceUrl: string;
}) {
  return shell(
    "Your payment is confirmed",
    `
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px">
      Hello ${details.name || "there"}, we have received your payment and your
      seat is confirmed. Your class details are in My Learning.
    </p>

    <table style="width:100%;border-collapse:collapse;background:#f4f5fa;border-radius:8px;padding:8px">
      <tbody>
        ${row("Invoice", details.invoiceNo)}
        ${row("Course", details.course)}
        ${row("Batch", details.batch)}
        ${row("Method", details.method)}
        ${row("Paid on", details.paidOn)}
        ${row("Amount", details.amount)}
      </tbody>
    </table>

    <p style="margin:24px 0 0">
      <a href="${details.invoiceUrl}"
         style="background:#414b96;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:bold;font-size:14px;display:inline-block">
        View or print your invoice
      </a>
    </p>
    `,
  );
}

export function refundEmail(details: {
  name: string;
  invoiceNo: string;
  course: string;
  amount: string;
}) {
  return shell(
    "Your payment has been refunded",
    `
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px">
      Hello ${details.name || "there"}, we have refunded your payment for
      ${details.course}. Your enrolment in that batch has been cancelled.
    </p>

    <table style="width:100%;border-collapse:collapse;background:#f4f5fa;border-radius:8px">
      <tbody>
        ${row("Invoice", details.invoiceNo)}
        ${row("Course", details.course)}
        ${row("Refunded", details.amount)}
      </tbody>
    </table>

    <p style="font-size:14px;line-height:1.6;margin:16px 0 0;color:#525d8d">
      Depending on how you paid, the money can take a few working days to
      reach you. Reply to this email if it has not arrived within a week.
    </p>
    `,
  );
}
