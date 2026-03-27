import type { QuotePrintOverrides } from "@/lib/quote-print-overrides";

/** Stored in quote_revisions.snapshot */
export type QuoteRevisionSnapshot = {
  title: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
  status: string;
  workflow_stage?: string;
  notes: string | null;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  print_overrides: QuotePrintOverrides | null;
  items: Array<{
    description: string;
    qty: number;
    unit_price_cents: number;
    line_total_cents: number;
  }>;
};

export function buildRevisionSnapshot(params: {
  quote: {
    title: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    zip: string;
    status: string;
    notes: string | null;
    subtotal_cents: number;
    tax_cents: number;
    total_cents: number;
    workflow_stage?: string | null;
    print_overrides?: unknown | null;
  };
  items: Array<{
    description: string;
    qty: number;
    unit_price_cents: number;
    line_total_cents: number;
  }>;
}): QuoteRevisionSnapshot {
  return {
    title: params.quote.title,
    address_line1: params.quote.address_line1,
    address_line2: params.quote.address_line2,
    city: params.quote.city,
    state: params.quote.state,
    zip: params.quote.zip,
    status: params.quote.status,
    workflow_stage: params.quote.workflow_stage ?? undefined,
    notes: params.quote.notes,
    subtotal_cents: params.quote.subtotal_cents,
    tax_cents: params.quote.tax_cents,
    total_cents: params.quote.total_cents,
    print_overrides: (params.quote.print_overrides ?? null) as QuotePrintOverrides | null,
    items: params.items.map((i) => ({
      description: i.description,
      qty: Number(i.qty),
      unit_price_cents: i.unit_price_cents,
      line_total_cents: i.line_total_cents,
    })),
  };
}
