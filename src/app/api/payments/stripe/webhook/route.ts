import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/payments/stripe";
import { markPaymentStatus, settlePayment } from "@/lib/payments/settle";

/**
 * Stripe webhook. Signature-verified, so this — not the browser return —
 * is what confirms an international payment.
 *
 * Local testing:  stripe listen --forward-to localhost:3000/api/payments/stripe/webhook
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const raw = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const tranId = session.metadata?.tran_id || session.client_reference_id;
      if (tranId && session.payment_status === "paid") {
        await settlePayment({
          tranId,
          providerRef: session.id,
          paidAmount: (session.amount_total ?? 0) / 100,
          meta: { source: "stripe_webhook", payment_intent: session.payment_intent },
        });
      }
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const tranId = session.metadata?.tran_id || session.client_reference_id;
      if (tranId) await markPaymentStatus(tranId, "cancelled", { source: "stripe_webhook" });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
