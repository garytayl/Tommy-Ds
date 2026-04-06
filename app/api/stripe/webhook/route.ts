import { getStripeServerClient } from "@/lib/stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asString(value: string | Stripe.PaymentIntent | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

async function syncCheckoutStatus(
  checkoutSession: Stripe.Checkout.Session,
  status: "paid" | "expired" | "failed",
) {
  const supabase = createSupabaseServiceClient();
  const paymentIntentId = asString(checkoutSession.payment_intent);

  const { data: isolatedPayment } = await supabase
    .from("isolated_payments")
    .select("id,invoice_id,amount_cents,stripe_checkout_session_id")
    .eq("stripe_checkout_session_id", checkoutSession.id)
    .maybeSingle();

  if (!isolatedPayment) return;

  const updates: {
    status: "paid" | "expired" | "failed";
    stripe_payment_intent_id?: string;
    paid_at?: string;
  } = { status };
  if (paymentIntentId) updates.stripe_payment_intent_id = paymentIntentId;
  if (status === "paid") updates.paid_at = new Date().toISOString();

  await supabase.from("isolated_payments").update(updates).eq("id", isolatedPayment.id);

  if (status !== "paid" || !isolatedPayment.invoice_id || !paymentIntentId) {
    return;
  }

  const { data: existingPayment } = await supabase
    .from("payments")
    .select("id")
    .eq("invoice_id", isolatedPayment.invoice_id)
    .eq("provider_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (existingPayment) return;

  await supabase.from("payments").insert({
    invoice_id: isolatedPayment.invoice_id,
    amount_cents: isolatedPayment.amount_cents,
    provider: "stripe",
    provider_payment_intent_id: paymentIntentId,
    status: "succeeded",
  });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 500 },
    );
  }

  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature header" },
      { status: 400 },
    );
  }

  const payload = await request.text();
  const stripe = getStripeServerClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    await syncCheckoutStatus(
      event.data.object as Stripe.Checkout.Session,
      "paid",
    );
  } else if (event.type === "checkout.session.expired") {
    await syncCheckoutStatus(
      event.data.object as Stripe.Checkout.Session,
      "expired",
    );
  } else if (event.type === "checkout.session.async_payment_failed") {
    await syncCheckoutStatus(
      event.data.object as Stripe.Checkout.Session,
      "failed",
    );
  }

  return NextResponse.json({ received: true });
}
