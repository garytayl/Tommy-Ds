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

/** Same copy as the VW / Stone Worx starter line — use as placeholder on template line-item description fields. */
export const VW_STONE_WORX_LINE_ITEM_DESCRIPTION_PLACEHOLDER =
  'Kitchen granite — Black Pearl (Suede); standard edge; 4" backsplash; negative reveal (3 cm); undermount sink install included (sink not included). Enter unit price when known.';

const vwStoneWorxLineItem: QuoteTemplateLineItem = {
  description: VW_STONE_WORX_LINE_ITEM_DESCRIPTION_PLACEHOLDER,
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
