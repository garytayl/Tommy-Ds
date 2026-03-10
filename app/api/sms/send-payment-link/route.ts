import { NextResponse } from "next/server";

import { getAppUrl } from "@/lib/config";
import { features } from "@/lib/config";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

const TWILIO_API = "https://api.twilio.com/2010-04-01";

type InvoiceRow = {
  id: string;
  job_id: string;
  balance_due_cents: number;
  status: string;
};
type JobRow = {
  id: string;
  title: string;
  customer_id: string;
};
type CustomerRow = { id: string; name: string; phone?: string | null; email?: string | null };

function normalizePhone(phone: string | null | undefined): string | null {
  const p = String(phone ?? "").replace(/\D/g, "");
  if (p.length < 10) return null;
  return p.length === 10 ? `+1${p}` : p.startsWith("1") ? `+${p}` : `+1${p}`;
}

export async function POST(request: Request) {
  if (!features.twilio) {
    return NextResponse.json(
      {
        error: "SMS not configured",
        message:
          "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to send payment links via text.",
      },
      { status: 501 }
    );
  }

  let body: { invoiceId?: string; phone?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const invoiceId = body?.invoiceId?.trim();
  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClientForData();
  const invoiceResult = await supabase
    .from("invoices")
    .select("id,job_id,balance_due_cents,status")
    .eq("id", invoiceId)
    .maybeSingle();

  const invoice = invoiceResult.data as InvoiceRow | null;
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  if (invoice.balance_due_cents <= 0) {
    return NextResponse.json(
      { error: "Invoice has no balance due" },
      { status: 400 }
    );
  }

  let toPhone = body?.phone?.trim() ? normalizePhone(body.phone) : null;
  if (!toPhone) {
    const jobResult = await supabase
      .from("jobs")
      .select("id,title,customer_id,customers(phone)")
      .eq("id", invoice.job_id)
      .maybeSingle();
    const job = jobResult.data as (JobRow & { customers?: CustomerRow | CustomerRow[] }) | null;
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    const cust = Array.isArray(job.customers) ? job.customers[0] : job.customers;
    toPhone = normalizePhone(cust?.phone ?? null);
  }
  if (!toPhone) {
    return NextResponse.json(
      {
        error: "No phone number",
        message:
          "Provide a phone number or add the customer's phone on the job/customer record.",
      },
      { status: 400 }
    );
  }

  const appUrl = getAppUrl(request.headers.get("origin") ?? undefined);
  const successUrl = `${appUrl}/payment/thank-you?payment=success&invoice_id=${encodeURIComponent(invoice.id)}`;
  const cancelUrl = `${appUrl}/payment/thank-you?payment=cancel`;

  const [{ data: job }, { data: customer }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id,title,customer_id")
      .eq("id", invoice.job_id)
      .maybeSingle(),
    supabase
      .from("jobs")
      .select("customers(id,name,email)")
      .eq("id", invoice.job_id)
      .maybeSingle(),
  ]);

  const jobRow = job as JobRow | null;
  const customerRelation = customer?.customers as CustomerRow | CustomerRow[] | null | undefined;
  const customerRow = Array.isArray(customerRelation) ? customerRelation[0] : customerRelation ?? null;

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: customerRow?.email ?? undefined,
    metadata: { invoice_id: invoice.id, job_id: jobRow?.id ?? "" },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: invoice.balance_due_cents,
          product_data: {
            name: `Tommy D's — ${jobRow?.title ?? "Payment"}`,
            description: customerRow ? `Invoice for ${customerRow.name}` : "Payment for Tommy D's service",
          },
        },
      },
    ],
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL" },
      { status: 502 }
    );
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER!;
  const messageBody = `Tommy D's: Pay your invoice here: ${session.url}`;

  const twilioRes = await fetch(
    `${TWILIO_API}/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: toPhone,
        From: fromPhone,
        Body: messageBody,
      }),
    }
  );

  if (!twilioRes.ok) {
    const errText = await twilioRes.text();
    return NextResponse.json(
      { error: "Failed to send SMS", message: errText },
      { status: 502 }
    );
  }

  return NextResponse.json({
    sent: true,
    message: "Payment link sent via SMS",
  });
}
