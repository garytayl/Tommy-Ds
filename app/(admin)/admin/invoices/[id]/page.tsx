import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { InvoiceSummary } from "@/components/InvoiceSummary";
import { formatCents, dollarsToCents } from "@/lib/money";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

const INVOICE_STATUSES = ["draft", "sent", "partially_paid", "paid", "void"];

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClientForData();

  const [invoiceResult, itemsResult, paymentsResult] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id,job_id,status,subtotal_cents,tax_cents,total_cents,deposit_paid_cents,balance_due_cents,jobs(id,title,customers(id,name))",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("invoice_items")
      .select("id,description,qty,unit_price_cents,line_total_cents,created_at")
      .eq("invoice_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("payments")
      .select("id,amount_cents,status,provider,provider_payment_intent_id,created_at")
      .eq("invoice_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const invoiceRecord = invoiceResult.data;
  const items = itemsResult.data ?? [];
  const payments = paymentsResult.data ?? [];

  if (!invoiceRecord) {
    notFound();
  }
  const invoice = invoiceRecord;
  const invoiceJobId = invoice.job_id;

  async function addInvoiceItem(formData: FormData) {
    "use server";

    const description = String(formData.get("description") ?? "").trim();
    const qty = Number.parseFloat(String(formData.get("qty") ?? "1"));
    const unitPriceCents = dollarsToCents(String(formData.get("unit_price") ?? "0"));

    if (!description || !Number.isFinite(qty) || qty <= 0 || unitPriceCents <= 0) {
      return;
    }

    const lineTotalCents = Math.round(qty * unitPriceCents);
    const supabase = await createSupabaseServerClientForData();
    await supabase.from("invoice_items").insert({
      invoice_id: id,
      description,
      qty,
      unit_price_cents: unitPriceCents,
      line_total_cents: lineTotalCents,
    });

    revalidatePath(`/admin/invoices/${id}`);
    revalidatePath(`/jobs/${invoiceJobId}`);
    revalidatePath(`/admin/jobs/${invoiceJobId}`);
  }

  async function updateTax(formData: FormData) {
    "use server";

    const taxCents = dollarsToCents(String(formData.get("tax") ?? "0"));
    const supabase = await createSupabaseServerClientForData();
    await supabase.from("invoices").update({ tax_cents: taxCents }).eq("id", id);
    await supabase.rpc("recompute_invoice_totals", { p_invoice_id: id });

    revalidatePath(`/admin/invoices/${id}`);
    revalidatePath(`/jobs/${invoiceJobId}`);
    revalidatePath(`/admin/jobs/${invoiceJobId}`);
  }

  async function updateInvoiceStatus(formData: FormData) {
    "use server";

    const status = String(formData.get("status") ?? "draft");
    if (!INVOICE_STATUSES.includes(status)) return;

    const supabase = await createSupabaseServerClientForData();
    await supabase.from("invoices").update({ status }).eq("id", id);
    revalidatePath(`/admin/invoices/${id}`);
    revalidatePath(`/jobs/${invoiceJobId}`);
    revalidatePath(`/admin/jobs/${invoiceJobId}`);
  }

  const invoiceJob = Array.isArray(invoice.jobs) ? invoice.jobs[0] : invoice.jobs;
  const invoiceCustomer = Array.isArray(invoiceJob?.customers)
    ? invoiceJob.customers[0]
    : invoiceJob?.customers;

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <section className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">Invoice {invoice.id.slice(0, 8)}</h1>
            <Link href={`/jobs/${invoiceJobId}`} className="link text-sm">
              Back to job
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">
            Job: {invoiceJob?.title ?? "-"} | Customer: {invoiceCustomer?.name ?? "-"}
          </p>

          <form action={updateInvoiceStatus} className="mt-4 flex items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
              <select
                name="status"
                defaultValue={invoice.status}
                className="field"
              >
                {INVOICE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary">
              Update
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <span className="block h-1 w-12 rounded-full bg-primary/80" />
          <h2 className="mt-3 text-base font-semibold text-foreground">Line items (price)</h2>
          <p className="mt-1 text-sm text-muted-foreground">Add description, quantity, and unit price. Totals update automatically.</p>
          <form action={addInvoiceItem} className="mt-3 grid gap-2 sm:grid-cols-4">
            <input
              name="description"
              type="text"
              required
              placeholder="Description"
              className="field sm:col-span-2"
            />
            <input
              name="qty"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue="1"
              className="field"
            />
            <input
              name="unit_price"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Unit price ($)"
              className="field"
            />
            <button type="submit" className="btn-primary sm:col-span-4">
              Add item
            </button>
          </form>

          <div className="table-wrap mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="table-header py-3 pl-5 pr-4">Description</th>
                  <th className="table-header py-3 pr-4">Qty</th>
                  <th className="table-header py-3 pr-4">Unit Price</th>
                  <th className="table-header py-3 pr-5">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border transition hover:bg-muted/30">
                    <td className="py-3 pl-5 pr-4">{item.description}</td>
                    <td className="py-3 pr-4 tabular-nums">{item.qty}</td>
                    <td className="py-3 pr-4 tabular-nums">{formatCents(item.unit_price_cents)}</td>
                    <td className="py-3 pr-5 font-medium tabular-nums">
                      {formatCents(item.line_total_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="border-b border-border bg-muted/50 px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">Payments</h2>
          </div>
          <div className="table-wrap overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="table-header py-3 pl-5 pr-4">Date</th>
                  <th className="table-header py-3 pr-4">Amount</th>
                  <th className="table-header py-3 pr-4">Status</th>
                  <th className="table-header py-3 pr-5">Provider Ref</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border transition hover:bg-muted/30">
                    <td className="py-3 pl-5 pr-4 text-muted-foreground">
                      {new Date(payment.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 tabular-nums">{formatCents(payment.amount_cents)}</td>
                    <td className="py-3 pr-4">{payment.status}</td>
                    <td className="py-3 pr-5 font-mono text-xs text-muted-foreground">
                      {payment.provider_payment_intent_id ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <InvoiceSummary invoice={invoice} />
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">Tax</h3>
          <form action={updateTax} className="mt-3 flex items-end gap-2">
            <div className="grow">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Tax amount ($)</label>
              <input
                type="number"
                name="tax"
                min="0"
                step="0.01"
                defaultValue={(invoice.tax_cents / 100).toFixed(2)}
                className="field w-full"
              />
            </div>
            <button type="submit" className="btn-primary">
              Save
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
