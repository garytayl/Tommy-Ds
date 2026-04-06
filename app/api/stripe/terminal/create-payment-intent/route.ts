import { getStripeServerClient, isStripeTerminalConfigured } from "@/lib/stripe";
import { getInstallerOrOfficeSessionOrNull } from "@/lib/server-action-guards";
import { NextResponse } from "next/server";

type CreateTerminalIntentBody = {
  amount_cents?: number;
  description?: string;
  note?: string | null;
  invoice_id?: string | null;
  job_id?: string | null;
  customer_id?: string | null;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanId(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

export async function POST(request: Request) {
  const session = await getInstallerOrOfficeSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isStripeTerminalConfigured()) {
    return NextResponse.json(
      { error: "Stripe Terminal is not configured" },
      { status: 500 },
    );
  }

  const { supabase, profile } = session;
  const body = (await request.json()) as CreateTerminalIntentBody;
  const amountCentsRaw = Number(body.amount_cents ?? 0);
  const amountCents = Number.isFinite(amountCentsRaw)
    ? Math.round(amountCentsRaw)
    : 0;
  const description = String(body.description ?? "").trim();
  const note = String(body.note ?? "").trim() || null;
  const invoiceId = cleanId(body.invoice_id);
  const submittedJobId = cleanId(body.job_id);
  const submittedCustomerId = cleanId(body.customer_id);

  if (amountCents <= 0 || !description) {
    return NextResponse.json(
      { error: "Amount and description are required" },
      { status: 400 },
    );
  }

  let resolvedJobId = submittedJobId;
  let resolvedCustomerId = submittedCustomerId;

  if (invoiceId) {
    const { data: invoice } = await supabase
      .from("invoices")
      .select("id,job_id")
      .eq("id", invoiceId)
      .maybeSingle();
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    resolvedJobId = resolvedJobId ?? invoice.job_id ?? null;
  }

  if (resolvedJobId && !resolvedCustomerId) {
    const { data: job } = await supabase
      .from("jobs")
      .select("id,customer_id")
      .eq("id", resolvedJobId)
      .maybeSingle();
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    resolvedCustomerId = job.customer_id ?? null;
  }

  const stripe = getStripeServerClient();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    payment_method_types: ["card_present"],
    capture_method: "automatic",
    description,
    metadata: {
      source: "terminal_card_present",
      invoice_id: invoiceId ?? "",
      job_id: resolvedJobId ?? "",
      customer_id: resolvedCustomerId ?? "",
      created_by: profile.user_id,
      note: note ?? "",
    },
  });

  const { data: isolatedPayment, error: insertError } = await supabase
    .from("isolated_payments")
    .insert({
      amount_cents: amountCents,
      description,
      note,
      status: "open",
      invoice_id: invoiceId,
      job_id: resolvedJobId,
      customer_id: resolvedCustomerId,
      stripe_payment_intent_id: paymentIntent.id,
      created_by: profile.user_id,
    })
    .select("id")
    .single();

  if (insertError || !isolatedPayment) {
    await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => undefined);
    return NextResponse.json(
      { error: "Failed to create local payment record" },
      { status: 500 },
    );
  }

  if (!paymentIntent.client_secret) {
    await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => undefined);
    return NextResponse.json(
      { error: "Payment intent is missing a client secret" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    payment_intent_id: paymentIntent.id,
    client_secret: paymentIntent.client_secret,
    isolated_payment_id: isolatedPayment.id,
  });
}
