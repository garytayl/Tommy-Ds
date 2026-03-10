import { NextResponse } from "next/server";

import { features } from "@/lib/config";
import {
  getDocuSignAccessToken,
  sendEnvelopeForSignature,
} from "@/lib/docusign";
import { formatCents } from "@/lib/money";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!features.docusign) {
    return NextResponse.json(
      {
        error: "DocuSign not configured",
        message:
          "Set DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, DOCUSIGN_ACCOUNT_ID, and DOCUSIGN_PRIVATE_KEY to enable sending documents for signature.",
      },
      { status: 501 }
    );
  }

  let body: { invoiceId?: string; signerEmail?: string; signerName?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const invoiceId = body?.invoiceId?.trim();
  if (!invoiceId) {
    return NextResponse.json(
      { error: "invoiceId is required" },
      { status: 400 }
    );
  }

  const signerEmail = body?.signerEmail?.trim();
  const signerName = (body?.signerName?.trim()) || "Customer";
  if (!signerEmail) {
    return NextResponse.json(
      {
        error: "Signer email required",
        message: "Add customer email on the job/customer record, or provide signerEmail in the request.",
      },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClientForData();
  const [
    invoiceResult,
    itemsResult,
    paymentsResult,
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id,job_id,status,subtotal_cents,tax_cents,total_cents,deposit_paid_cents,created_at,jobs(id,title,address_line1,address_line2,city,state,zip,customers(id,name,email,phone))",
      )
      .eq("id", invoiceId)
      .maybeSingle(),
    supabase
      .from("invoice_items")
      .select("id,description,qty,unit_price_cents,line_total_cents")
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: true }),
    supabase
      .from("payments")
      .select("id,amount_cents,created_at")
      .eq("invoice_id", invoiceId)
      .eq("status", "succeeded")
      .order("created_at", { ascending: false }),
  ]);

  const invoice = invoiceResult.data;
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const items = itemsResult.data ?? [];
  const payments = paymentsResult.data ?? [];
  const job = Array.isArray(invoice.jobs) ? invoice.jobs[0] : invoice.jobs;
  const customer = job?.customers
    ? (Array.isArray(job.customers) ? job.customers[0] : job.customers)
    : null;

  const rows = items
    .map(
      (i) =>
        `<tr><td>${escapeHtml(i.description)}</td><td style="text-align:right">${i.qty}</td><td style="text-align:right">${formatCents(i.unit_price_cents)}</td><td style="text-align:right">${formatCents(i.line_total_cents)}</td></tr>`
    )
    .join("");
  const paymentRows = payments
    .map(
      (p) =>
        `<tr><td>${new Date(p.created_at).toLocaleString()}</td><td style="text-align:right">${formatCents(p.amount_cents)}</td></tr>`
    )
    .join("");

  const receiptHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Receipt ${invoice.id.slice(0, 8)}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <h1>Payment receipt</h1>
  <p>Invoice #${invoice.id.slice(0, 8)} · ${new Date(invoice.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
  <p><strong>From:</strong> Tommy D's Windows, Doors, & More, Inc.<br>3148 S. State Road 446, Bloomington, IN 47401</p>
  <p><strong>Bill to:</strong> ${escapeHtml(customer?.name ?? "—")}${customer?.email ? ` (${escapeHtml(customer.email)})` : ""}</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <thead><tr style="border-bottom:1px solid #ccc;"><th style="text-align:left">Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="text-align:right">Subtotal: ${formatCents(invoice.subtotal_cents)} · Tax: ${formatCents(invoice.tax_cents)} · <strong>Total: ${formatCents(invoice.total_cents)}</strong></p>
  <h2>Payments received</h2>
  <table style="width:100%;border-collapse:collapse;"><tbody>${paymentRows || "<tr><td>—</td></tr>"}</tbody></table>
  <p>Amount paid: ${formatCents(invoice.deposit_paid_cents)} · Status: ${invoice.status.replace("_", " ")}</p>
  <p style="margin-top:32px;color:#666;">By signing, you acknowledge receipt of this payment.</p>
</body>
</html>`;

  const accessToken = await getDocuSignAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { error: "DocuSign authentication failed" },
      { status: 502 }
    );
  }

  const accountId = process.env.DOCUSIGN_ACCOUNT_ID!;
  const result = await sendEnvelopeForSignature(
    accessToken,
    accountId,
    receiptHtml,
    `Receipt ${invoice.id.slice(0, 8)}`,
    signerEmail,
    signerName
  );

  if (!result) {
    return NextResponse.json(
      { error: "Failed to create DocuSign envelope" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    envelopeId: result.envelopeId,
    signingUrl: result.signingUrl,
    message: result.signingUrl
      ? "Envelope sent. Open the link to sign."
      : "Envelope sent. Check your email to sign.",
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
