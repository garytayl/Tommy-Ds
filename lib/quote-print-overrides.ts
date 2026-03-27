/** Stored on `quotes.print_overrides` — optional PDF-only edits before print. */

export type QuotePrintLineOverride = {
  description: string;
  qty: number;
  unit_price_cents: number;
  line_total_cents: number;
};

export type QuotePrintOverrides = {
  title?: string | null;
  /** Override document label (e.g. "Estimate" / "Formal quote") */
  doc_label?: string | null;
  /** Free-text date line for "Prepared …" */
  prepared_date_text?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  project_address?: string | null;
  /** Replaces quote.notes on the PDF when set (including empty string to hide) */
  notes?: string | null;
  hide_line_items?: boolean;
  /** Customer-facing PDF: omit phone on the Customer card */
  hide_customer_phone?: boolean;
  /** Omit email on the Customer card */
  hide_customer_email?: boolean;
  /** Omit the whole Project address section */
  hide_project_address?: boolean;
  /** Omit page 2 notes / scope block (even if notes text exists) */
  hide_notes?: boolean;
  /** In the pricing table: omit Qty column */
  hide_qty?: boolean;
  /** In the pricing table: omit Unit price column */
  hide_unit_prices?: boolean;
  /** In the totals box: show only Grand total (hide subtotal + tax rows) */
  hide_subtotal_tax?: boolean;
  /** Omit the Reference # line under Prepared date */
  hide_reference?: boolean;
  /** Extra line under totals / above footer */
  footer_note?: string | null;
  /** When present with length > 0, table uses these rows and subtotal/total follow sums + quote.tax_cents */
  line_items?: QuotePrintLineOverride[] | null;
};

export function parsePrintOverrides(raw: unknown): QuotePrintOverrides | null {
  if (raw == null || typeof raw !== "object") return null;
  return raw as QuotePrintOverrides;
}

/**
 * Removes blocks that duplicate the PDF header (customer card, pricing table) or the page footer.
 * Used only for print/PDF output so legacy notes in the DB still render fully in admin.
 */
export function stripRedundantSectionsForPrint(notes: string | null): string | null {
  if (notes == null || !String(notes).trim()) return notes;
  let s = String(notes).replace(/\r\n/g, "\n");

  s = s.replace(
    /\n*CUSTOMER INFORMATION\s*\n[\s\S]*?(?=\n+\s*(?:PROJECT DETAILS|PRICING|KEY TERMS|SCOPE NOTES|COUNTERTOP ESTIMATE|DETAILS\s*&\s*NOTES))/i,
    "\n\n",
  );

  s = s.replace(
    /\n*PRICING\s*\([^)]*\)[^\n]*\n[\s\S]*?(?=\n+\s*(?:KEY TERMS|SCOPE NOTES|TOMMY))/i,
    "\n\n",
  );

  s = s.replace(
    /\n{0,2}TOMMY D'S\s*·\s*WINDOWS,\s*DOORS\s*&\s*MORE\s*\nThank you for your business\. Figures are subject to final field verification\. Scheduling and final invoicing are handled separately unless otherwise agreed\.?\s*$/im,
    "",
  );

  s = s.replace(/\n{3,}/g, "\n\n").trim();
  return s.length ? s : null;
}

export type QuoteLike = {
  title: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  notes: string | null;
  created_at: string;
};

export type CustomerLike = {
  name: string | null;
  phone: string | null;
  email: string | null;
} | null;

export type ItemLike = {
  description: string;
  qty: number;
  unit_price_cents: number;
  line_total_cents: number;
};

export type MergedQuotePrint = {
  title: string;
  docLabel: string;
  preparedDateText: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  projectAddress: string;
  notes: string | null;
  hideLineItems: boolean;
  hideCustomerPhone: boolean;
  hideCustomerEmail: boolean;
  hideProjectAddress: boolean;
  hideNotes: boolean;
  hideQty: boolean;
  hideUnitPrices: boolean;
  hideSubtotalTax: boolean;
  hideReference: boolean;
  footerNote: string | null;
  items: ItemLike[];
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
};

function formatAddress(q: QuoteLike): string {
  const a2 = q.address_line2 ? `, ${q.address_line2}` : "";
  return `${q.address_line1}${a2}, ${q.city}, ${q.state} ${q.zip}`;
}

export function mergeQuoteForPrint(params: {
  quote: QuoteLike;
  customer: CustomerLike;
  items: ItemLike[];
  docLabelFromStage: string;
  overrides: QuotePrintOverrides | null;
}): MergedQuotePrint {
  const o = params.overrides ?? {};
  const baseAddress = formatAddress(params.quote);

  const li = o.line_items;
  const useOverrideLines = Array.isArray(li) && li.length > 0;
  const tableItems: ItemLike[] = useOverrideLines
    ? li!.map((r) => ({
        description: r.description,
        qty: Number(r.qty),
        unit_price_cents: Math.round(r.unit_price_cents),
        line_total_cents: Math.round(r.line_total_cents),
      }))
    : params.items;

  let subtotal_cents = params.quote.subtotal_cents;
  let total_cents = params.quote.total_cents;
  if (useOverrideLines) {
    subtotal_cents = tableItems.reduce((s, r) => s + r.line_total_cents, 0);
    total_cents = subtotal_cents + params.quote.tax_cents;
  }

  const notes =
    o.notes !== undefined && o.notes !== null ? o.notes : params.quote.notes;

  const preparedDateText =
    o.prepared_date_text?.trim() ||
    new Date(params.quote.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return {
    title: o.title?.trim() || params.quote.title,
    docLabel: o.doc_label?.trim() || params.docLabelFromStage,
    preparedDateText,
    customerName: o.customer_name?.trim() || params.customer?.name || "—",
    customerPhone: o.customer_phone !== undefined && o.customer_phone !== null
      ? o.customer_phone.trim() || null
      : params.customer?.phone ?? null,
    customerEmail: o.customer_email !== undefined && o.customer_email !== null
      ? o.customer_email.trim() || null
      : params.customer?.email ?? null,
    projectAddress: o.project_address?.trim() || baseAddress,
    notes: notes?.trim() ? notes : null,
    hideLineItems: Boolean(o.hide_line_items),
    hideCustomerPhone: o.hide_customer_phone === true,
    hideCustomerEmail: o.hide_customer_email === true,
    hideProjectAddress: o.hide_project_address === true,
    hideNotes: o.hide_notes === true,
    hideQty: o.hide_qty === true,
    hideUnitPrices: o.hide_unit_prices === true,
    hideSubtotalTax: o.hide_subtotal_tax === true,
    hideReference: o.hide_reference === true,
    footerNote: o.footer_note?.trim() || null,
    items: tableItems,
    subtotal_cents,
    tax_cents: params.quote.tax_cents,
    total_cents,
  };
}
