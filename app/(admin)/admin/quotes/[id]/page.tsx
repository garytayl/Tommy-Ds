import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { formatCents, dollarsToCents } from "@/lib/money";
import { computeTaxCents } from "@/lib/tax";
import { setToastCookie } from "@/lib/toast";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

const QUOTE_STATUSES = ["draft", "sent", "accepted", "declined"];

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClientForData();

  const [quoteResult, itemsResult] = await Promise.all([
    supabase
      .from("quotes")
      .select("id,customer_id,title,address_line1,address_line2,city,state,zip,status,subtotal_cents,tax_cents,total_cents,notes,job_id,created_at,customers(id,name,phone,email)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("quote_items")
      .select("id,description,qty,unit_price_cents,line_total_cents,created_at")
      .eq("quote_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const quote = quoteResult.data;
  const items = itemsResult.data ?? [];

  if (!quote) notFound();

  const customer = Array.isArray(quote.customers) ? quote.customers[0] : quote.customers;

  async function addQuoteItem(formData: FormData) {
    "use server";

    const description = String(formData.get("description") ?? "").trim();
    const qty = Number.parseFloat(String(formData.get("qty") ?? "1"));
    const unitPriceCents = dollarsToCents(String(formData.get("unit_price") ?? "0"));

    if (!description || !Number.isFinite(qty) || qty <= 0 || unitPriceCents <= 0) return;

    const lineTotalCents = Math.round(qty * unitPriceCents);
    const supabase = await createSupabaseServerClientForData();
    await supabase.from("quote_items").insert({
      quote_id: id,
      description,
      qty,
      unit_price_cents: unitPriceCents,
      line_total_cents: lineTotalCents,
    });
    // Auto-apply Indiana default tax after line items change (staff can override in tax field)
    const { data: q } = await supabase.from("quotes").select("subtotal_cents").eq("id", id).single();
    if (q?.subtotal_cents != null) {
      const taxCents = computeTaxCents(q.subtotal_cents);
      await supabase.from("quotes").update({ tax_cents: taxCents }).eq("id", id);
      await supabase.rpc("recompute_quote_totals", { p_quote_id: id });
    }

    await setToastCookie("Line item added");
    revalidatePath(`/admin/quotes/${id}`);
  }

  async function updateQuoteTax(formData: FormData) {
    "use server";

    const taxCents = dollarsToCents(String(formData.get("tax") ?? "0"));
    const supabase = await createSupabaseServerClientForData();
    await supabase.from("quotes").update({ tax_cents: taxCents }).eq("id", id);
    await supabase.rpc("recompute_quote_totals", { p_quote_id: id });

    await setToastCookie("Tax updated");
    revalidatePath(`/admin/quotes/${id}`);
  }

  async function updateQuoteStatus(formData: FormData) {
    "use server";

    const status = String(formData.get("status") ?? "draft");
    if (!QUOTE_STATUSES.includes(status)) return;

    const supabase = await createSupabaseServerClientForData();
    const { data: current } = await supabase.from("quotes").select("job_id,status").eq("id", id).single();
    await supabase.from("quotes").update({ status }).eq("id", id);

    if (current?.job_id && status === "sent") {
      await supabase.from("activities").insert({
        job_id: current.job_id,
        type: "quote_sent",
        title: "Quote sent",
        status: "completed",
      });
    }
    if (current?.job_id && status === "accepted") {
      await supabase.from("jobs").update({ status: "approved" }).eq("id", current.job_id);
      await supabase.from("activities").insert({
        job_id: current.job_id,
        type: "customer_acceptance",
        title: "Customer accepted quote",
        status: "completed",
      });
    }

    await setToastCookie("Quote updated");
    revalidatePath(`/admin/quotes/${id}`);
    revalidatePath(`/jobs/${current?.job_id ?? ""}`);
  }

  async function convertQuoteToJob(formData: FormData) {
    "use server";

    const quoteId = formData.get("quote_id");
    if (typeof quoteId !== "string") return;

    const supabase = await createSupabaseServerClientForData();
    const { data: quoteRow } = await supabase
      .from("quotes")
      .select("id,customer_id,title,address_line1,address_line2,city,state,zip,notes,subtotal_cents,tax_cents,total_cents,job_id")
      .eq("id", quoteId)
      .maybeSingle();

    if (!quoteRow || quoteRow.job_id) return;

    const { data: newJob } = await supabase
      .from("jobs")
      .insert({
        customer_id: quoteRow.customer_id,
        title: quoteRow.title,
        address_line1: quoteRow.address_line1,
        address_line2: quoteRow.address_line2 ?? null,
        city: quoteRow.city,
        state: quoteRow.state,
        zip: quoteRow.zip,
        job_kind: "installation",
        status: "lead",
        notes: quoteRow.notes ?? null,
      })
      .select("id")
      .single();

    if (!newJob) return;

    const { data: newInvoice } = await supabase
      .from("invoices")
      .insert({
        job_id: newJob.id,
        status: "draft",
        subtotal_cents: quoteRow.subtotal_cents,
        tax_cents: quoteRow.tax_cents,
        total_cents: quoteRow.total_cents,
        balance_due_cents: quoteRow.total_cents,
      })
      .select("id")
      .single();

    const itemsRes = await supabase.from("quote_items").select("description,qty,unit_price_cents,line_total_cents").eq("quote_id", quoteId).order("created_at", { ascending: true });
    const quoteItems = itemsRes.data ?? [];
    if (newInvoice && quoteItems.length > 0) {
      await supabase.from("invoice_items").insert(
        quoteItems.map((item) => ({
          invoice_id: newInvoice.id,
          description: item.description,
          qty: item.qty,
          unit_price_cents: item.unit_price_cents,
          line_total_cents: item.line_total_cents,
        }))
      );
      await supabase.rpc("recompute_invoice_totals", { p_invoice_id: newInvoice.id });
    }

    await supabase
      .from("quotes")
      .update({ job_id: newJob.id, status: "accepted" })
      .eq("id", quoteId);
    await supabase.from("jobs").update({ status: "approved" }).eq("id", newJob.id);
    await supabase.from("activities").insert({
      job_id: newJob.id,
      type: "customer_acceptance",
      title: "Customer accepted quote",
      status: "completed",
    });

    await setToastCookie("Quote converted to job");
    revalidatePath("/admin/quotes");
    revalidatePath(`/admin/quotes/${id}`);
    revalidatePath("/admin/jobs");
    revalidatePath("/admin/schedule");
    const { redirect: rd } = await import("next/navigation");
    rd(`/jobs/${newJob.id}`);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Quote
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {quote.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {customer?.name ?? "-"} · {quote.address_line1}, {quote.city}, {quote.state} {quote.zip}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/admin/quotes/${id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Print / Save as PDF
          </a>
          {!quote.job_id && (quote.status === "draft" || quote.status === "sent") && (
            <form action={convertQuoteToJob}>
              <input type="hidden" name="quote_id" value={quote.id} />
              <button type="submit" className="btn-primary">
                Convert to job
              </button>
            </form>
          )}
          {quote.job_id && (
            <Link href={`/jobs/${quote.job_id}`} className="btn-primary">
              Open job
            </Link>
          )}
          <Link href="/admin/quotes" className="btn-secondary">
            Back to quotes
          </Link>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Status</h2>
        <form action={updateQuoteStatus} className="mt-3 flex items-end gap-2">
          <select
            name="status"
            defaultValue={quote.status}
            className="field"
            disabled={!!quote.job_id}
          >
            {QUOTE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {!quote.job_id && (
            <button type="submit" className="btn-primary">
              Update
            </button>
          )}
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <span className="block h-1 w-12 rounded-full bg-primary/80" />
        <h2 className="mt-3 text-base font-semibold text-foreground">Line items</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add description, quantity, and unit price. Totals update automatically.
        </p>
        <form action={addQuoteItem} className="mt-3 grid gap-2 sm:grid-cols-4">
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
          <button type="submit" className="btn-primary sm:col-span-4" disabled={!!quote.job_id}>
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

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4">
          <form action={updateQuoteTax} className="flex items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Tax ($)</label>
              <p className="mb-1 text-xs text-muted-foreground">Auto 7% (Indiana) when you add line items; override if needed.</p>
              <input
                type="number"
                name="tax"
                min="0"
                step="0.01"
                defaultValue={(quote.tax_cents / 100).toFixed(2)}
                className="field w-28"
                disabled={!!quote.job_id}
              />
            </div>
            {!quote.job_id && (
              <button type="submit" className="btn-primary">
                Save tax
              </button>
            )}
          </form>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Subtotal: {formatCents(quote.subtotal_cents)}</p>
            <p className="text-sm text-muted-foreground">Tax: {formatCents(quote.tax_cents)}</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              Total: {formatCents(quote.total_cents)}
            </p>
          </div>
        </div>
      </section>

      {quote.notes && (
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{quote.notes}</p>
        </section>
      )}
    </div>
  );
}
