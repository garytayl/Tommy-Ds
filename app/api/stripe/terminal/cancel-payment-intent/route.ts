import { getInstallerOrOfficeApiSessionOrNull } from "@/lib/api-auth";
import { getStripeServerClient, isStripeTerminalConfigured } from "@/lib/stripe";
import { NextResponse } from "next/server";

type CancelTerminalIntentBody = {
  payment_intent_id?: string;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getInstallerOrOfficeApiSessionOrNull(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isStripeTerminalConfigured()) {
    return NextResponse.json(
      { error: "Stripe Terminal is not configured" },
      { status: 500 },
    );
  }

  const body = (await request.json()) as CancelTerminalIntentBody;
  const paymentIntentId = String(body.payment_intent_id ?? "").trim();
  if (!paymentIntentId) {
    return NextResponse.json(
      { error: "payment_intent_id is required" },
      { status: 400 },
    );
  }

  const stripe = getStripeServerClient();
  const { supabase } = session;

  await stripe.paymentIntents.cancel(paymentIntentId).catch(() => undefined);
  await supabase
    .from("isolated_payments")
    .update({ status: "canceled" })
    .eq("stripe_payment_intent_id", paymentIntentId);

  return NextResponse.json({ ok: true });
}
