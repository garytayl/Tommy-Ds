import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/PrintButton";
import { formatCents } from "@/lib/money";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

export default async function InvoicePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClientForData();

  const [invoiceResult, itemsResult] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id,invoice_number,status,subtotal_cents,tax_cents,total_cents,deposit_paid_cents,balance_due_cents,created_at,jobs(id,title,address_line1,address_line2,city,state,zip,customers(name,email,phone))",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("invoice_items")
      .select("id,description,qty,unit_price_cents,line_total_cents")
      .eq("invoice_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const invoice = invoiceResult.data;
  const items = itemsResult.data ?? [];

  if (!invoice) {
    notFound();
  }

  const job = Array.isArray(invoice.jobs) ? invoice.jobs[0] : invoice.jobs;
  const customer = Array.isArray(job?.customers) ? job.customers[0] : job?.customers;
  const serviceAddress = job
    ? `${job.address_line1}${job.address_line2 ? `, ${job.address_line2}` : ""}, ${job.city}, ${job.state} ${job.zip}`
    : "-";

  return (
    <div className="bg-background p-4 sm:p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl space-y-4 print:max-w-none print:space-y-0">
        <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <Link href={`/admin/invoices/${id}`} className="btn-secondary">
            Back to invoice
          </Link>
          <PrintButton />
        </div>
        <p className="text-xs text-muted-foreground print:hidden">
          For a clean PDF, uncheck browser print <strong>Headers and footers</strong>.
        </p>

        <article className="rounded-2xl border border-border bg-white p-6 text-black shadow-sm sm:p-8 print:rounded-none print:border-0 print:pb-4 print:pt-0 print:shadow-none">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-black/20 pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/60">Invoice preview</p>
              <h1 className="mt-1 text-2xl font-bold">Tommy D&apos;s Windows, Doors, &amp; More</h1>
              <p className="mt-1 text-sm text-black/70">Internal invoice copy for customer delivery</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/60">Invoice #</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">#{invoice.invoice_number}</p>
              <p className="mt-1 text-sm capitalize text-black/70">{invoice.status.replace("_", " ")}</p>
              <p className="mt-1 text-sm text-black/70">
                Date:{" "}
                {new Date(invoice.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </header>

          <section className="mt-6 grid gap-6 text-sm sm:grid-cols-2">
            <div>
              <h2 className="font-semibold uppercase tracking-wide text-black/70">Bill to</h2>
              <p className="mt-1 text-base font-medium">{customer?.name ?? "-"}</p>
              {customer?.email ? <p>{customer.email}</p> : null}
              {customer?.phone ? <p>{customer.phone}</p> : null}
            </div>
            <div>
              <h2 className="font-semibold uppercase tracking-wide text-black/70">Service job</h2>
              <p className="mt-1 text-base font-medium">{job?.title ?? "-"}</p>
              <p className="mt-1">{serviceAddress}</p>
            </div>
          </section>

          <section className="mt-8">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-black/30">
                  <th className="py-2 text-left font-semibold">Description</th>
                  <th className="w-20 py-2 text-right font-semibold">Qty</th>
                  <th className="w-28 py-2 text-right font-semibold">Unit</th>
                  <th className="w-28 py-2 text-right font-semibold">Line total</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr className="border-b border-black/10">
                    <td colSpan={4} className="py-4 text-black/60">
                      No line items added yet.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-b border-black/10">
                      <td className="py-2">{item.description}</td>
                      <td className="py-2 text-right tabular-nums">{item.qty}</td>
                      <td className="py-2 text-right tabular-nums">{formatCents(item.unit_price_cents)}</td>
                      <td className="py-2 text-right font-medium tabular-nums">{formatCents(item.line_total_cents)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section className="mt-6 flex justify-end">
            <dl className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-black/70">Subtotal</dt>
                <dd className="tabular-nums">{formatCents(invoice.subtotal_cents)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-black/70">Tax</dt>
                <dd className="tabular-nums">{formatCents(invoice.tax_cents)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-black/20 pt-2 font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatCents(invoice.total_cents)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-black/70">Paid</dt>
                <dd className="tabular-nums">{formatCents(invoice.deposit_paid_cents)}</dd>
              </div>
              <div className="flex items-center justify-between text-base font-bold">
                <dt>Balance due</dt>
                <dd className="tabular-nums">{formatCents(invoice.balance_due_cents)}</dd>
              </div>
            </dl>
          </section>

          <footer className="mt-10 border-t border-black/20 pt-4 text-xs text-black/60">
            Thank you for your business. Please contact our office if you have any questions about this invoice.
          </footer>
        </article>
      </div>
    </div>
  );
}
