"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperations, requireRole, str } from "./guard";
import { settlePayment } from "@/lib/payments/settle";
import { paymentApprovedEmail, refundEmail, sendMail } from "@/lib/mail";
import { formatMoney } from "@/lib/format";
import { siteUrl } from "@/lib/site";
import type { EnrollmentStatus } from "@/lib/types";

// ---------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------

export async function updateStudent(form: FormData) {
  const { db } = await requireOperations();
  const id = str(form, "id");
  if (!id) redirect("/admin/students");

  await db
    .from("profiles")
    .update({
      full_name: str(form, "full_name"),
      phone: str(form, "phone"),
      emergency_name: str(form, "emergency_name"),
      emergency_phone: str(form, "emergency_phone"),
      emergency_relation: str(form, "emergency_relation"),
    })
    .eq("id", id);

  revalidatePath(`/admin/students/${id}`);
  redirect(`/admin/students/${id}?saved=1`);
}

/**
 * Promotes a student to administrator, or demotes them back. Only admins may
 * do this, and never to their own account — that is the one change that can
 * lock everybody out of the dashboard.
 *
 * The `role` column is what the guard reads; `is_admin` is kept in step by a
 * database trigger, so writing the role is enough.
 */
export async function setStudentAdmin(form: FormData) {
  const { db, user } = await requireRole(["admin"]);
  const id = str(form, "id");
  const next = str(form, "is_admin") === "true";

  if (!id) return;
  if (id === user.id && !next) {
    redirect(`/admin/students/${id}?error=self_demote`);
  }

  await db
    .from("profiles")
    .update({ role: next ? "admin" : "student" })
    .eq("id", id);

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${id}`);
}

// ---------------------------------------------------------------------
// Enrolments
// ---------------------------------------------------------------------

const ENROLMENT_STATUSES: EnrollmentStatus[] = [
  "pending_payment",
  "active",
  "completed",
  "cancelled",
];

export async function setEnrollmentStatus(form: FormData) {
  const { db } = await requireOperations();
  const id = str(form, "id");
  const next = str(form, "status") as EnrollmentStatus;

  if (!id || !ENROLMENT_STATUSES.includes(next)) return;

  await db.from("enrollments").update({ status: next }).eq("id", id);

  revalidatePath("/admin/enrolments");
  revalidatePath("/admin");
}

export async function updateEnrollmentNote(form: FormData) {
  const { db } = await requireOperations();
  const id = str(form, "id");
  if (!id) return;

  await db.from("enrollments").update({ note: str(form, "note") }).eq("id", id);
  revalidatePath("/admin/enrolments");
}

/** Enrols a student by hand — for walk-ins who paid at the desk. */
export async function createEnrollment(form: FormData) {
  const { db } = await requireOperations();
  const userId = str(form, "user_id");
  const batchId = str(form, "batch_id");
  const status = str(form, "status") as EnrollmentStatus;

  if (!userId || !batchId) redirect("/admin/enrolments?error=fields");

  const { data: batch } = await db
    .from("batches")
    .select("course_id")
    .eq("id", batchId)
    .maybeSingle();

  if (!batch) redirect("/admin/enrolments?error=batch");

  const { error } = await db.from("enrollments").insert({
    user_id: userId,
    batch_id: batchId,
    course_id: batch.course_id,
    status: ENROLMENT_STATUSES.includes(status) ? status : "active",
    note: str(form, "note"),
  });

  if (error) {
    const reason = error.code === "23505" ? "already_enrolled" : "failed";
    redirect(`/admin/enrolments?error=${reason}`);
  }

  revalidatePath("/admin/enrolments");
  redirect("/admin/enrolments?created=1");
}

// ---------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------

/**
 * Confirms a manual transfer, activates the enrolment, issues an invoice
 * number and emails the student their receipt.
 *
 * The email is best-effort: a mail server having a bad day must not leave a
 * paid student un-enrolled, so a failure is logged and the approval stands.
 */
export async function approvePayment(form: FormData) {
  const { user, db } = await requireOperations();
  const tranId = str(form, "tran_id");
  if (!tranId) return;

  const settled = await settlePayment({
    tranId,
    providerRef: str(form, "provider_ref") || null,
    meta: { source: "admin_review" },
  });

  await db.from("payments").update({ verified_by: user.id }).eq("tran_id", tranId);

  if (settled.ok) {
    const { data: payment } = await db
      .from("payments")
      .select(
        "id, amount, currency, provider, meta, verified_at, user_id, enrollment:enrollments (course:courses (title_en), batch:batches (name))",
      )
      .eq("tran_id", tranId)
      .maybeSingle();

    if (payment) {
      const { data: invoiceNo } = await db.rpc("assign_invoice_no", {
        payment: payment.id,
      });

      const [{ data: profile }, { data: account }] = await Promise.all([
        db.from("profiles").select("full_name").eq("id", payment.user_id).maybeSingle(),
        db.auth.admin.getUserById(payment.user_id),
      ]);

      const enrollment = (
        Array.isArray(payment.enrollment) ? payment.enrollment[0] : payment.enrollment
      ) as {
        course: { title_en: string } | { title_en: string }[];
        batch: { name: string } | { name: string }[] | null;
      } | null;

      const course = enrollment
        ? ((Array.isArray(enrollment.course)
            ? enrollment.course[0]
            : enrollment.course) as { title_en: string } | null)
        : null;
      const batch = enrollment
        ? ((Array.isArray(enrollment.batch)
            ? enrollment.batch[0]
            : enrollment.batch) as { name: string } | null)
        : null;

      const channel = String((payment.meta as Record<string, unknown>)?.channel ?? "");
      const method =
        payment.provider === "manual"
          ? channel === "cash"
            ? "Cash at the centre"
            : channel === "bank"
              ? "Bank transfer"
              : channel
                ? channel.charAt(0).toUpperCase() + channel.slice(1)
                : "Manual transfer"
          : payment.provider === "sslcommerz"
            ? "SSLCommerz"
            : "Card";

      const to = account?.user?.email ?? "";

      if (to) {
        await sendMail({
          to,
          subject: `Payment confirmed — ${course?.title_en ?? "your course"}`,
          kind: "payment_approved",
          paymentId: payment.id,
          html: paymentApprovedEmail({
            name: profile?.full_name ?? "",
            invoiceNo: String(invoiceNo ?? ""),
            course: course?.title_en ?? "Course enrolment",
            batch: batch?.name ?? "—",
            amount: formatMoney(Number(payment.amount), payment.currency),
            method,
            paidOn: new Date(payment.verified_at ?? Date.now()).toLocaleDateString(
              "en-GB",
              { year: "numeric", month: "short", day: "numeric" },
            ),
            invoiceUrl: `${siteUrl}/invoice/${payment.id}`,
          }),
        });
      }
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/payments");
}

export async function rejectPayment(form: FormData) {
  const { user, db } = await requireOperations();
  const tranId = str(form, "tran_id");
  if (!tranId) return;

  const { data: payment } = await db
    .from("payments")
    .select("id, status, meta")
    .eq("tran_id", tranId)
    .maybeSingle();

  if (!payment || payment.status === "paid") return;

  await db
    .from("payments")
    .update({
      status: "failed",
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      meta: {
        ...(payment.meta as object),
        rejected_reason: str(form, "reason") || "not_found",
      },
    })
    .eq("id", payment.id);

  revalidatePath("/admin");
  revalidatePath("/admin/payments");
}

/** Marks a paid payment refunded and cancels its enrolment. */
export async function refundPayment(form: FormData) {
  const { user, db } = await requireOperations();
  const tranId = str(form, "tran_id");
  if (!tranId) return;

  const { data: payment } = await db
    .from("payments")
    .select("id, enrollment_id, status, meta")
    .eq("tran_id", tranId)
    .maybeSingle();

  if (!payment || payment.status !== "paid") return;

  await db
    .from("payments")
    .update({
      status: "refunded",
      verified_by: user.id,
      meta: { ...(payment.meta as object), refunded_at: new Date().toISOString() },
    })
    .eq("id", payment.id);

  await db
    .from("enrollments")
    .update({ status: "cancelled" })
    .eq("id", payment.enrollment_id);

  // Tell the student their money is coming back.
  const { data: full } = await db
    .from("payments")
    .select(
      "id, amount, currency, invoice_no, user_id, enrollment:enrollments (course:courses (title_en))",
    )
    .eq("id", payment.id)
    .maybeSingle();

  if (full) {
    const [{ data: profile }, { data: account }] = await Promise.all([
      db.from("profiles").select("full_name").eq("id", full.user_id).maybeSingle(),
      db.auth.admin.getUserById(full.user_id),
    ]);

    const enrollment = (
      Array.isArray(full.enrollment) ? full.enrollment[0] : full.enrollment
    ) as { course: { title_en: string } | { title_en: string }[] } | null;
    const course = enrollment
      ? ((Array.isArray(enrollment.course)
          ? enrollment.course[0]
          : enrollment.course) as { title_en: string } | null)
      : null;

    const to = account?.user?.email ?? "";

    if (to) {
      await sendMail({
        to,
        subject: `Refund issued — ${course?.title_en ?? "your course"}`,
        kind: "payment_refunded",
        paymentId: full.id,
        html: refundEmail({
          name: profile?.full_name ?? "",
          invoiceNo: full.invoice_no ?? "—",
          course: course?.title_en ?? "your course",
          amount: formatMoney(Number(full.amount), full.currency),
        }),
      });
    }
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin");
}

/** Records a fee taken in cash at the centre. */
export async function recordOfflinePayment(form: FormData) {
  const { user, db } = await requireOperations();
  const enrollmentId = str(form, "enrollment_id");
  const reference = str(form, "reference") || `CASH-${Date.now().toString(36).toUpperCase()}`;

  if (!enrollmentId) redirect("/admin/enrolments?error=fields");

  const { data: enrollment } = await db
    .from("enrollments")
    .select("id, user_id, course:courses (price_bdt)")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (!enrollment) redirect("/admin/enrolments?error=missing");

  const course = (
    Array.isArray(enrollment.course) ? enrollment.course[0] : enrollment.course
  ) as { price_bdt: number } | undefined;

  await db.from("payments").insert({
    enrollment_id: enrollment.id,
    user_id: enrollment.user_id,
    provider: "manual",
    status: "paid",
    amount: Number(course?.price_bdt ?? 0),
    currency: "BDT",
    tran_id: `OFF-${reference}`,
    provider_ref: reference,
    verified_at: new Date().toISOString(),
    verified_by: user.id,
    meta: { source: "recorded_at_centre" },
  });

  await db.from("enrollments").update({ status: "active" }).eq("id", enrollment.id);

  revalidatePath("/admin/enrolments");
  revalidatePath("/admin/payments");
  redirect("/admin/payments?recorded=1");
}

// ---------------------------------------------------------------------
// Contact messages
// ---------------------------------------------------------------------

export async function setMessageHandled(form: FormData) {
  const { db } = await requireOperations();
  const id = str(form, "id");
  const handled = str(form, "handled") === "true";

  if (!id) return;

  await db.from("contact_messages").update({ handled }).eq("id", id);
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
}

export async function deleteMessage(form: FormData) {
  const { db } = await requireOperations();
  const id = str(form, "id");
  if (!id) return;

  await db.from("contact_messages").delete().eq("id", id);
  revalidatePath("/admin/messages");
}
