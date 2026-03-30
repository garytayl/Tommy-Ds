/**
 * Built-in estimate starters live here; custom templates are stored in `quote_templates` and merged at runtime.
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

/**
 * JSON-serializable template row for passing Server → Client (RSC cannot send functions like `buildNotes`).
 */
export type QuoteTemplateClientOption = {
  id: string;
  name: string;
  description: string;
  defaultTitle: string;
  /** Result of `buildNotes(asOf)` computed on the server */
  defaultNotes: string;
};

export function toQuoteTemplateClientOptions(
  defs: readonly QuoteTemplateDefinition[],
  asOf: Date = new Date(),
): QuoteTemplateClientOption[] {
  return defs.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    defaultTitle: d.defaultTitle,
    defaultNotes: d.buildNotes(asOf),
  }));
}

/** Row shape from `public.quote_templates` (line_items JSON array). */
export type QuoteTemplateDbRow = {
  id: string;
  name: string;
  description: string;
  default_title: string;
  notes_text: string | null;
  line_items: unknown;
  sort_order: number;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuidString(s: string): boolean {
  return UUID_RE.test(s.trim());
}

export function coerceQuoteTemplateLineItems(raw: unknown): QuoteTemplateLineItem[] {
  if (!Array.isArray(raw)) return [];
  const out: QuoteTemplateLineItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const description = String(o.description ?? "").trim();
    if (!description) continue;
    const qty = Number(o.qty);
    const unit = Math.round(Number(o.unit_price_cents) || 0);
    const line = Math.round(Number(o.line_total_cents) || 0);
    out.push({
      description,
      qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
      unit_price_cents: unit,
      line_total_cents: line,
    });
  }
  return out;
}

export function dbRowToDefinition(row: QuoteTemplateDbRow): QuoteTemplateDefinition {
  const notes = row.notes_text ?? "";
  return {
    id: row.id,
    name: row.name,
    description: row.description || "Custom template",
    defaultTitle: row.default_title ?? "",
    buildNotes: () => notes,
    lineItems: coerceQuoteTemplateLineItems(row.line_items),
  };
}

export function findQuoteTemplateInList<T extends { id: string }>(
  id: string | null | undefined,
  definitions: readonly T[],
): T | null {
  if (!id || id === BLANK_QUOTE_TEMPLATE_ID) {
    return definitions.find((t) => t.id === BLANK_QUOTE_TEMPLATE_ID) ?? null;
  }
  return definitions.find((t) => t.id === id) ?? null;
}

export function normalizeTemplateIdInList(
  raw: string | null | undefined,
  definitions: ReadonlyArray<{ id: string }>,
): string {
  const s = String(raw ?? "").trim();
  if (!s) return BLANK_QUOTE_TEMPLATE_ID;
  return findQuoteTemplateInList(s, definitions) ? s : BLANK_QUOTE_TEMPLATE_ID;
}

export const BLANK_QUOTE_TEMPLATE_ID = "blank";

/** Deep link: `/admin/quotes/new?template=${VW_STONE_WORX_COUNTERTOP_TEMPLATE_ID}` (guided); `/admin/quotes/new/form?template=…` for single-page form */
export const VW_STONE_WORX_COUNTERTOP_TEMPLATE_ID = "vw_stone_worx_countertop";

/** Deep link: `/admin/quotes/new?template=${TOMMY_DS_CABINETRY_ESTIMATE_TEMPLATE_ID}` */
export const TOMMY_DS_CABINETRY_ESTIMATE_TEMPLATE_ID = "tommy_ds_cabinetry";

/** Deep link: `/admin/quotes/new?template=${KITCHEN_QUARTZ_EXTENDED_FLUSH_COUNTERTOP_TEMPLATE_ID}` */
export const KITCHEN_QUARTZ_EXTENDED_FLUSH_COUNTERTOP_TEMPLATE_ID = "kitchen_quartz_extended_flush";

/**
 * VW / Stone Worx–style kitchen countertop scope + terms (Indiana).
 * Empty-field placeholders in the estimate UI mirror this (`QUOTE_NOTES_SECTION_PLACEHOLDERS` in `@/lib/quote-notes-sections`).
 */
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

/**
 * Tommy D's kitchen cabinetry scope + terms (Indiana).
 * Dollar amounts live on line items / quote totals; notes reference drawing date and standard conditions.
 */
export function buildCabinetryEstimateNotes(asOf: Date = new Date()): string {
  const dateStr = asOf.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });

  return `CABINETRY ESTIMATE
Date: ${dateStr}

Client: (customer name)

Tommy D's Custom Cabinetry Specifications
Includes ½" all plywood construction, soft close hinges and drawer guides, full extension wood dovetail drawers with concealed guides, flush and finished ends, fillers, stand base moulding and panel, scribe moulding, matching toe board, and a touch-up kit.

Kitchen Cabinetry
Door Style: Shaker (Standard Door)
Wood Species: Maple
Painted: TBD (non-custom color)
Rollout trays included in selected cabinets
Includes standard overlay and solid slab drawer fronts

Pricing Summary
Subtotal, tax, and total: from quote line items and tax settings below.

Notes
Quote corresponds with drawing dated (drawing date)
Estimate valid for 30 days
Cabinetry measure and delivery included; installation excluded
Cabinetry lead time is approximately 12–14 weeks from deposit/signed proposal to delivery
Removal and haul away of existing cabinetry and countertops excluded
Countertop final price based on digital template
Thank you for your inquiry; we look forward to working with you!`;
}

/**
 * Kitchen quartz with extended flush section — tiered “Simply Better” pricing, additions, and sketch notes.
 * Tier $ amounts are reference figures from the price sheet; enter the chosen scope on line items.
 */
export function buildKitchenQuartzExtendedFlushCountertopNotes(asOf: Date = new Date()): string {
  const dateStr = asOf.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });

  return `KITCHEN COUNTERTOP (W/ EXTENDED FLUSH SECTION)
Date: ${dateStr}

Customer: (customer name)

Quartz Countertop with Flush Section
Color: TBD
Edge: TBD
Splash: None
“Simply Better” Quartz Line – 70 SF – 3CM

Countertop Pricing (by Group)
Group 0 Countertops: $5,568.75
Group 1 Countertops: $6,513.75
Group 2 Countertops: $7,269.75
Group 3 Countertops: $7,836.75
Group 4 Countertops: $8,592.72
Group 5 Countertops: $9,065.25
Group 6 Countertops: $10,955.25
Group 7 Countertops: $12,372.75

Additions
Brackets — $324.00
Includes four and installed by fabricator.
They will determine at time of measure if brackets will work for this application.
Stainless Steel Sink — $105.00
Karran Sink Options (PU51, PU53, PU55)
Application of Paintable Latex Caulk at Drywall — $70.00

Handwritten Notes (from image)
“Quartz” (written near top)
“Flush” (top right)
“Kitchen” (left margin)
“Four” crossed out under brackets note`;
}

/** Same copy as the VW / Stone Worx starter line — default text for that template's line item. */
export const VW_STONE_WORX_LINE_ITEM_DESCRIPTION_PLACEHOLDER =
  'Kitchen granite — Black Pearl (Suede); standard edge; 4" backsplash; negative reveal (3 cm); undermount sink install included (sink not included). Enter unit price when known.';

/** Default text for the cabinetry template's starter line item. */
export const CABINETRY_ESTIMATE_LINE_ITEM_DESCRIPTION_PLACEHOLDER =
  "Kitchen cabinetry — Shaker (Standard Door), Maple, painted TBD (non-custom color); rollout trays in selected cabinets; standard overlay and solid slab drawer fronts. Enter unit price when known.";

/** Default text for the extended-flush quartz kitchen countertop starter line item. */
export const KITCHEN_QUARTZ_EXTENDED_FLUSH_LINE_ITEM_DESCRIPTION_PLACEHOLDER =
  'Kitchen quartz — extended flush section; “Simply Better” line, 3 cm, ~70 SF. Pick group tier and additions per notes. Enter unit price when known.';

/** Neutral hint for custom template line-item fields (avoids countertop-only wording). */
export const QUOTE_TEMPLATE_LINE_ITEM_EDITOR_PLACEHOLDER =
  "Describe scope (materials, finish, inclusions). Enter unit price when known.";

const vwStoneWorxLineItem: QuoteTemplateLineItem = {
  description: VW_STONE_WORX_LINE_ITEM_DESCRIPTION_PLACEHOLDER,
  qty: 1,
  unit_price_cents: 0,
  line_total_cents: 0,
};

const cabinetryEstimateLineItem: QuoteTemplateLineItem = {
  description: CABINETRY_ESTIMATE_LINE_ITEM_DESCRIPTION_PLACEHOLDER,
  qty: 1,
  unit_price_cents: 0,
  line_total_cents: 0,
};

const kitchenQuartzExtendedFlushLineItem: QuoteTemplateLineItem = {
  description: KITCHEN_QUARTZ_EXTENDED_FLUSH_LINE_ITEM_DESCRIPTION_PLACEHOLDER,
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
  {
    id: TOMMY_DS_CABINETRY_ESTIMATE_TEMPLATE_ID,
    name: "Cabinetry estimate",
    description:
      "Tommy D's specs, terms, and a starter kitchen cabinetry line (pricing starts at $0 — adjust on the quote).",
    defaultTitle: "Kitchen Cabinetry",
    buildNotes: buildCabinetryEstimateNotes,
    lineItems: [cabinetryEstimateLineItem],
  },
  {
    id: KITCHEN_QUARTZ_EXTENDED_FLUSH_COUNTERTOP_TEMPLATE_ID,
    name: "Kitchen quartz – extended flush",
    description:
      "Quartz with flush section, tiered group pricing, additions, and sketch notes (line item starts at $0 — adjust on the quote).",
    defaultTitle: "Kitchen Countertop – Quartz (Extended Flush)",
    buildNotes: buildKitchenQuartzExtendedFlushCountertopNotes,
    lineItems: [kitchenQuartzExtendedFlushLineItem],
  },
];

/** Built-ins first, then DB rows (by sort_order, then name — caller should order rows). */
export function mergeQuoteTemplateDefinitions(dbRows: QuoteTemplateDbRow[]): QuoteTemplateDefinition[] {
  const custom = dbRows.map(dbRowToDefinition);
  return [...QUOTE_TEMPLATES, ...custom];
}

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
