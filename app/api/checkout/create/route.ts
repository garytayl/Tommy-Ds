import { NextResponse } from "next/server";

import { getAppUrl } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

type ProfileRow = { role: "admin" | "manager" | "installer" | string };
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
  assigned_installer_id: string | null;
};
type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
};

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { invoiceId?: string };
    const invoiceId = body?.invoiceId?.trim();
    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
    }

    const [profileResult, invoiceResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("invoices")
        .select("id,job_id,balance_due_cents,status")
        .eq("id", invoiceId)
        .maybeSingle(),
    ]);

    const profile = profileResult.data as ProfileRow | null;
    const invoice = invoiceResult.data as InvoiceRow | null;

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (invoice.balance_due_cents <= 0) {
      return NextResponse.json(
        { error: "Invoice has no balance due" },
        { status: 400 },
      );
    }

    const [{ data: job }, { data: customer }] = await Promise.all([
      supabase
        .from("jobs")
        .select("id,title,customer_id,assigned_installer_id")
        .eq("id", invoice.job_id)
        .maybeSingle(),
      supabase
        .from("jobs")
        .select("customers(id,name,email)")
        .eq("id", invoice.job_id)
        .maybeSingle(),
    ]);

    const jobRow = job as JobRow | null;
    const customerRelation = customer?.customers as
      | CustomerRow
      | CustomerRow[]
      | null
      | undefined;
    const customerRow = Array.isArray(customerRelation)
      ? customerRelation[0]
      : customerRelation ?? null;

    if (!jobRow) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const role = profile.role;
    const isInstallerAssigned =
      role === "installer" && jobRow.assigned_installer_id === user.id;
    const canManage = role === "admin" || role === "manager";
    if (!canManage && !isInstallerAssigned) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const appUrl = getAppUrl(request.headers.get("origin") ?? undefined);

    // Customer-facing: after paying (or cancelling) on Stripe they land on our public thank-you page.
    const successUrl = `${appUrl}/payment/thank-you?payment=success`;
    const cancelUrl = `${appUrl}/payment/thank-you?payment=cancel`;

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerRow?.email ?? undefined,
      metadata: {
        invoice_id: invoice.id,
        job_id: jobRow.id,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: invoice.balance_due_cents,
            product_data: {
              name: `Tommy D's Windows, Doors, & More — ${jobRow.title}`,
              description: customerRow
                ? `Invoice for ${customerRow.name}`
                : "Payment for Tommy D's service",
            },
          },
        },
      ],
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Checkout session failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
