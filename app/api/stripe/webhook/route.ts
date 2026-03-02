import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const invoiceId = session.metadata?.invoice_id;
  if (!invoiceId) return;

  const jobIdFromMetadata = session.metadata?.job_id ?? null;
  const amountCents = session.amount_total ?? 0;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const supabase = createSupabaseServiceClient();

  if (paymentIntentId) {
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("invoice_id", invoiceId)
      .eq("provider_payment_intent_id", paymentIntentId)
      .maybeSingle();

    if (!existingPayment) {
      await supabase.from("payments").insert({
        invoice_id: invoiceId,
        amount_cents: amountCents,
        provider: "stripe",
        provider_payment_intent_id: paymentIntentId,
        status: "succeeded",
      });
    }
  } else {
    await supabase.from("payments").insert({
      invoice_id: invoiceId,
      amount_cents: amountCents,
      provider: "stripe",
      status: "succeeded",
    });
  }

  await supabase.rpc("recompute_invoice_totals", { p_invoice_id: invoiceId });

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id,job_id,status,balance_due_cents")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice) return;

  if (invoice.status === "paid" || invoice.balance_due_cents === 0) {
    const jobId = jobIdFromMetadata ?? invoice.job_id;
    await supabase.from("jobs").update({ status: "paid" }).eq("id", jobId);
  }
}

export async function POST(request: Request) {
  const stripeSignature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSignature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing Stripe webhook signature or secret" },
      { status: 400 },
    );
  }

  const body = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, stripeSignature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      default:
        break;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
