/**
 * Built-in estimate/quote starters. Add new templates here (DB-backed templates can come later).
 */

export type QuoteTemplateLineItem = {
  description: string;
  qty: number;
  unit_price_cents: number;
  line_total_cents: number;
};

export type QuoteTemplateDefinition = {
  id: string;
  name: string;
  /** Shown under the name in the new-estimate form */
  description: string;
  defaultTitle: string;
  /** Pre-filled notes (no customer block — that lives on the PDF header) */
  buildNotes: (asOf?: Date) => string;
  lineItems: QuoteTemplateLineItem[];
};

export const BLANK_QUOTE_TEMPLATE_ID = "blank";

/** Deep link: `/admin/quotes/new?template=${VW_STONE_WORX_COUNTERTOP_TEMPLATE_ID}` */
export const VW_STONE_WORX_COUNTERTOP_TEMPLATE_ID = "vw_stone_worx_countertop";

/** VW / Stone Worx–style kitchen countertop scope + terms (Indiana). */
export function buildVwStoneWorxCountertopNotes(asOf: Date = new Date()): string {
  const dateStr = asOf.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `COUNTERTOP ESTIMATE
Date: ${dateStr}

PROJECT DETAILS
Project: Kitchen – Granite Countertop
Color: Black Pearl (Suede Finish)
Edge Profile: Standard edge (Bevel not available with this fabricator)
Backsplash: 4"
Reveal: Negative reveal (3 cm)
Thickness: 3 cm
Sink: Not provided by customer — customer to supply
Installation: Undermount sink installation included

SCOPE NOTES
• Fabricator does not offer bevel edge for this material/finish
• Final measurements may affect final pricing

KEY TERMS / CONDITIONS
• Estimate valid for 30 days
• Based on rough sketch
• Includes digital template, delivery, and installation
• Final pricing depends on template measurements
• Tear-out/removal NOT included
• Plumbing, electrical, gas, carpentry NOT included
• Plumbing must be disconnected before install
• Reconnection must be done by a licensed plumber
• Faucet must be on-site during template
• Seam placement determined by fabricator
• Sealant applied between countertop & backsplash only
• 50% deposit required to proceed`;
}

const vwStoneWorxLineItem: QuoteTemplateLineItem = {
  description:
    'Kitchen granite — Black Pearl (Suede); standard edge; 4" backsplash; negative reveal (3 cm); undermount sink install included (sink not included). Enter unit price when known.',
  qty: 1,
  unit_price_cents: 0,
  line_total_cents: 0,
};

export const QUOTE_TEMPLATES: QuoteTemplateDefinition[] = [
  {
    id: BLANK_QUOTE_TEMPLATE_ID,
    name: "Blank",
    description: "Empty line items and notes — fill in everything yourself.",
    defaultTitle: "",
    buildNotes: () => "",
    lineItems: [],
  },
  {
    id: VW_STONE_WORX_COUNTERTOP_TEMPLATE_ID,
    name: "VW / Stone Worx Countertop",
    description:
      "Kitchen granite scope, key terms, and a starter line item (pricing starts at $0 — adjust on the quote).",
    defaultTitle: "Kitchen – Granite Countertop",
    buildNotes: buildVwStoneWorxCountertopNotes,
    lineItems: [vwStoneWorxLineItem],
  },
];

export function getQuoteTemplate(id: string | null | undefined): QuoteTemplateDefinition | null {
  if (!id || id === BLANK_QUOTE_TEMPLATE_ID) {
    return QUOTE_TEMPLATES.find((t) => t.id === BLANK_QUOTE_TEMPLATE_ID) ?? null;
  }
  return QUOTE_TEMPLATES.find((t) => t.id === id) ?? null;
}

export function normalizeTemplateId(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s) return BLANK_QUOTE_TEMPLATE_ID;
  return getQuoteTemplate(s) ? s : BLANK_QUOTE_TEMPLATE_ID;
}
