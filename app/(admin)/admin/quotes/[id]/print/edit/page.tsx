import Link from "next/link";
import { notFound } from "next/navigation";

import { mergeQuoteForPrint, parsePrintOverrides } from "@/lib/quote-print-overrides";
import { workflowStageLabel } from "@/lib/quote-workflow";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

import { QuotePrintEditorForm } from "./QuotePrintEditorForm";

export default async function QuotePrintEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClientForData();

  const [quoteResult, itemsResult] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "id,title,address_line1,address_line2,city,state,zip,subtotal_cents,tax_cents,total_cents,notes,created_at,workflow_stage,print_overrides,customers(name,phone,email)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("quote_items")
      .select("description,qty,unit_price_cents,line_total_cents")
      .eq("quote_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const quote = quoteResult.data;
  const items = itemsResult.data ?? [];

  if (!quote) notFound();

  const customer = Array.isArray(quote.customers) ? quote.customers[0] : quote.customers;
  const stage = (quote as { workflow_stage?: string }).workflow_stage === "quote" ? "quote" : "estimate";
  const overrides = parsePrintOverrides((quote as { print_overrides?: unknown }).print_overrides);

  const merged = mergeQuoteForPrint({
    quote: {
      title: quote.title,
      address_line1: quote.address_line1,
      address_line2: quote.address_line2,
      city: quote.city,
      state: quote.state,
      zip: quote.zip,
      subtotal_cents: quote.subtotal_cents,
      tax_cents: quote.tax_cents,
      total_cents: quote.total_cents,
      notes: quote.notes,
      created_at: quote.created_at,
    },
    customer: customer
      ? { name: customer.name, phone: customer.phone, email: customer.email }
      : null,
    items: items.map((i) => ({
      description: i.description,
      qty: Number(i.qty),
      unit_price_cents: i.unit_price_cents,
      line_total_cents: i.line_total_cents,
    })),
    docLabelFromStage: workflowStageLabel(stage),
    overrides,
  });

  const hasSavedOverrides = overrides != null && Object.keys(overrides).length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Print</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Prepare PDF</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Edit what appears on the printed estimate or quote. Saving stores a print-only version; the live quote is
            unchanged unless you edit it on the main quote screen.
          </p>
        </div>
        <Link href={`/admin/quotes/${id}`} className="btn-secondary">
          Back to quote
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <QuotePrintEditorForm quoteId={id} merged={merged} hasSavedOverrides={hasSavedOverrides} />
      </div>
    </div>
  );
}
