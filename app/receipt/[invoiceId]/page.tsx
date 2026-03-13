import Link from "next/link";
import { notFound } from "next/navigation";

import { PayWithCardButton } from "@/components/PayWithCardButton";
import { formatCents } from "@/lib/money";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";
import { ReceiptPrintButton } from "./ReceiptPrintButton";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const supabase = await createSupabaseServerClientForData();

  const [
    invoiceResult,
    itemsResult,
    paymentsResult,
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id,invoice_number,job_id,status,subtotal_cents,tax_cents,total_cents,deposit_paid_cents,balance_due_cents,created_at,jobs(id,title,address_line1,address_line2,city,state,zip,customers(id,name,email,phone))",
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
      .select("id,amount_cents,status,created_at")
      .eq("invoice_id", invoiceId)
      .eq("status", "succeeded")
      .order("created_at", { ascending: false }),
  ]);

  const invoice = invoiceResult.data;
  const items = itemsResult.data ?? [];
  const payments = paymentsResult.data ?? [];

  if (!invoice) notFound();

  const job = Array.isArray(invoice.jobs) ? invoice.jobs[0] : invoice.jobs;
  const customer = job?.customers
    ? (Array.isArray(job.customers) ? job.customers[0] : job.customers)
    : null;

  return (
    <div className="min-h-screen bg-background print:min-h-0">
      {/* Customer-facing header: back link + print only */}
      <div className="print:hidden border-b border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-medium text-primary hover:underline">
              ← Tommy D&apos;s
            </Link>
            <Link href="/pay" className="text-sm text-muted-foreground hover:text-foreground">
              Pay another invoice
            </Link>
          </div>
          <ReceiptPrintButton />
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8 print:py-4 print:pb-0">
        <article className="rounded-xl border border-border bg-card p-6 shadow-sm print:shadow-none print:border-0 print:break-inside-avoid">
          <header className="border-b border-border pb-4">
            <h1 className="text-2xl font-semibold text-foreground">
              Your receipt
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Thank you for your payment. Invoice #{invoice.invoice_number} ·{" "}
              {new Date(invoice.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </header>

          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                From
              </h2>
              <p className="mt-1 font-medium text-foreground">
                Tommy D&apos;s Windows, Doors, & More, Inc.
              </p>
              <p className="text-sm text-muted-foreground">
                3148 S. State Road 446, Bloomington, IN 47401
              </p>
              <a
                href="tel:812-330-8898"
                className="text-sm text-primary hover:underline"
              >
                812-330-8898
              </a>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your information
              </h2>
              <p className="mt-1 font-medium text-foreground">
                {customer?.name ?? "—"}
              </p>
              {customer?.email ? (
                <p className="text-sm text-muted-foreground">{customer.email}</p>
              ) : null}
              {customer?.phone ? (
                <p className="text-sm text-muted-foreground">{customer.phone}</p>
              ) : null}
              {job ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {job.title}
                  <br />
                  {job.address_line1}
                  {job.address_line2 ? `, ${job.address_line2}` : ""}
                  <br />
                  {job.city}, {job.state} {job.zip}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What you paid for
            </h2>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 font-medium text-foreground">Description</th>
                  <th className="py-2 text-right font-medium text-foreground">Qty</th>
                  <th className="py-2 text-right font-medium text-foreground">Price</th>
                  <th className="py-2 text-right font-medium text-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border">
                    <td className="py-2 text-foreground">{item.description}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">
                      {item.qty}
                    </td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">
                      {formatCents(item.unit_price_cents)}
                    </td>
                    <td className="py-2 text-right tabular-nums font-medium">
                      {formatCents(item.line_total_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <dl className="w-48 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{formatCents(invoice.subtotal_cents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax</dt>
                <dd className="tabular-nums">{formatCents(invoice.tax_cents)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-medium">
                <dt className="text-foreground">Total</dt>
                <dd className="tabular-nums">{formatCents(invoice.total_cents)}</dd>
              </div>
            </dl>
          </div>

          <section className="mt-6 border-t border-border pt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your payments
            </h2>
            <ul className="mt-2 space-y-1">
              {payments.length === 0 ? (
                <li className="text-sm text-muted-foreground">No payments on this receipt yet.</li>
              ) : (
                payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {new Date(p.created_at).toLocaleString()}
                    </span>
                    <span className="tabular-nums font-medium text-foreground">
                      {formatCents(p.amount_cents)}
                    </span>
                  </li>
                ))
              )}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              We&apos;ve received {formatCents(invoice.deposit_paid_cents)} from you. Thank you for your business.
            </p>
          </section>

          {invoice.balance_due_cents > 0 ? (
            <section className="mt-6 border-t border-border pt-4 print:hidden">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Balance due
              </h2>
              <p className="mt-2 text-sm text-foreground">
                Balance due: <span className="font-semibold tabular-nums">{formatCents(invoice.balance_due_cents)}</span>
              </p>
              <div className="mt-3">
                <PayWithCardButton invoiceId={invoice.id} label="Pay remaining balance" />
              </div>
            </section>
          ) : null}
        </article>
      </main>

    </div>
  );
}
