import { formatCents } from "@/lib/money";

import type { CustomerLike, ItemLike, QuoteLike } from "@/lib/quote-print-overrides";
import { mergeQuoteForPrint, parsePrintOverrides } from "@/lib/quote-print-overrides";

/** Human-readable differences when print overrides change the PDF vs live quote data. */
export function getPrintVsLiveDriftMessages(
  quote: QuoteLike,
  customer: CustomerLike,
  items: ItemLike[],
  docLabelFromStage: string,
  rawOverrides: unknown,
): string[] {
  const overrides = parsePrintOverrides(rawOverrides);
  if (!overrides || Object.keys(overrides).length === 0) return [];

  const live = mergeQuoteForPrint({ quote, customer, items, docLabelFromStage, overrides: null });
  const printed = mergeQuoteForPrint({ quote, customer, items, docLabelFromStage, overrides });

  const msgs: string[] = [];
  if (printed.title !== live.title) msgs.push("PDF title differs from the live title on this page.");
  if (printed.docLabel !== live.docLabel) msgs.push("Document label on the PDF differs from the live stage label.");
  if ((printed.notes ?? "") !== (live.notes ?? "")) msgs.push("Notes/details block on the PDF differs from live notes.");
  if (printed.customerName !== live.customerName) msgs.push("Customer name on the PDF differs from the customer record.");
  if ((printed.customerPhone ?? "") !== (live.customerPhone ?? "")) msgs.push("Phone on the PDF differs from the customer record.");
  if ((printed.customerEmail ?? "") !== (live.customerEmail ?? "")) msgs.push("Email on the PDF differs from the customer record.");
  if (printed.projectAddress !== live.projectAddress) msgs.push("Project address on the PDF differs from the live address fields.");
  if (printed.hideLineItems) msgs.push("Line items are hidden on the PDF.");
  if (printed.subtotal_cents !== live.subtotal_cents || printed.total_cents !== live.total_cents) {
    msgs.push(
      `PDF totals (${formatCents(printed.total_cents)} total, ${formatCents(printed.subtotal_cents)} subtotal) differ from live (${formatCents(live.total_cents)} total, ${formatCents(live.subtotal_cents)} subtotal).`,
    );
  }
  if ((printed.footerNote ?? "") !== "") msgs.push("PDF includes an extra footer note.");
  return msgs;
}
