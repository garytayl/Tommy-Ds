/**
 * Multi-field estimate scope: stored as JSON on quotes.notes_sections, composed into quotes.notes
 * for print, revisions, and legacy consumers.
 */

/** PostgREST/Supabase error when `notes_sections` is selected or written before migration is applied. */
export function isNotesSectionsColumnError(error: { message?: string } | null | undefined): boolean {
  return (error?.message ?? "").toLowerCase().includes("notes_sections");
}

import { parseStructuredQuoteNotes } from "@/lib/quote-notes-parse";

export type QuoteNotesSections = {
  cover: string;
  customer_information: string;
  project_details: string;
  pricing: string;
  scope_notes: string;
  key_terms: string;
  /** Unstructured or legacy tail (DETAILS & NOTES, QUOTE hero, plaintext). */
  misc: string;
};

export const QUOTE_NOTES_SECTION_KEYS = [
  "cover",
  "customer_information",
  "project_details",
  "pricing",
  "scope_notes",
  "key_terms",
  "misc",
] as const satisfies readonly (keyof QuoteNotesSections)[];

export const FORM_PREFIX = "ns_" as const;

export function emptyQuoteNotesSections(): QuoteNotesSections {
  return {
    cover: "",
    customer_information: "",
    project_details: "",
    pricing: "",
    scope_notes: "",
    key_terms: "",
    misc: "",
  };
}

/**
 * Grey placeholder copy for empty section fields — same style as `buildVwStoneWorxCountertopNotes` in
 * `@/lib/quote-templates`. Update both when the built-in VW / Stone Worx template changes.
 */
export const QUOTE_NOTES_SECTION_PLACEHOLDERS: Record<keyof QuoteNotesSections, string> = {
  cover: "Date: March 15, 2026",
  customer_information: `Jane Smith
123 Oak St
Indianapolis, IN 46204
(317) 555-0199`,
  project_details: `Project: Kitchen – Granite Countertop
Color: Black Pearl (Suede Finish)
Edge Profile: Standard edge (Bevel not available with this fabricator)
Backsplash: 4"
Reveal: Negative reveal (3 cm)
Thickness: 3 cm
Sink: Not provided by customer — customer to supply
Installation: Undermount sink installation included`,
  pricing: `Subtotal: $4,200.00
Tax: $297.50
Total: $4,497.50
(Reference only — line items control system totals.)`,
  scope_notes: `• Fabricator does not offer bevel edge for this material/finish
• Final measurements may affect final pricing`,
  key_terms: `• Estimate valid for 30 days
• Based on rough sketch
• Includes digital template, delivery, and installation
• Final pricing depends on template measurements
• Tear-out/removal NOT included
• Plumbing, electrical, gas, carpentry NOT included
• Plumbing must be disconnected before install
• 50% deposit required to proceed`,
  misc: `DETAILS & NOTES
Call before arrival. Customer prefers Saturday morning.`,
};

/**
 * Default body for the PRICING (reference) section when a template does not supply one.
 * Shown on new-estimate wizard and form; replace $0.00 lines with real figures for the PDF if desired.
 */
export const DEFAULT_PRICING_REFERENCE_SECTION = `Subtotal: $0.00
Tax: $0.00
Total: $0.00
(Reference only — line items control system totals.)`;

export function applyDefaultPricingReferenceIfEmpty(s: QuoteNotesSections): QuoteNotesSections {
  if (s.pricing.trim()) return s;
  return { ...s, pricing: DEFAULT_PRICING_REFERENCE_SECTION };
}

/** Print PDF editor — project address (example site). */
export const QUOTE_PRINT_EDITOR_PROJECT_ADDRESS_PLACEHOLDER = `456 Elm Street
Greenwood, IN 46143`;

/** Print PDF editor — scope / notes block (VW-style excerpt). */
export const QUOTE_PRINT_EDITOR_NOTES_BLOCK_PLACEHOLDER = `Kitchen – Granite Countertop
Color: Black Pearl (Suede Finish); standard edge; 4" backsplash; negative reveal (3 cm).
Undermount sink installation included (sink not included). See KEY TERMS for exclusions.`;

/** Print PDF editor — footer line. */
export const QUOTE_PRINT_EDITOR_FOOTER_PLACEHOLDER = "Thank you for choosing Tommy D's";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** If body already starts with the header line, use as-is; otherwise prepend header + newline. */
function joinHeader(header: string, body: string): string | null {
  const b = body.trim();
  if (!b) return null;
  const re = new RegExp(`^${escapeRegex(header)}`, "i");
  if (re.test(b)) return b;
  return `${header}\n${b}`;
}

/** Cover field may store body-only (legacy COUNTERTOP) or full hero+body for other estimate types. */
function composeCover(cover: string): string | null {
  const c = cover.trim();
  if (!c) return null;
  if (/^COUNTERTOP ESTIMATE/i.test(c)) return c;
  if (/^CABINETRY ESTIMATE/i.test(c)) return c;
  if (/^KITCHEN COUNTERTOP/i.test(c)) return c;
  return `COUNTERTOP ESTIMATE\n${c}`;
}

const DEFAULT_HEADERS = {
  pricing: "PRICING (reference — line items control totals in the system)",
  keyTerms: "KEY TERMS / CONDITIONS",
  customer: "CUSTOMER INFORMATION",
  project: "PROJECT DETAILS",
  scope: "SCOPE NOTES",
} as const;

/** Build canonical `quotes.notes` string from section fields. */
export function composeNotesFromSections(s: QuoteNotesSections): string | null {
  const parts: string[] = [];

  const cov = composeCover(s.cover);
  if (cov) parts.push(cov);

  const cust = joinHeader(DEFAULT_HEADERS.customer, s.customer_information);
  if (cust) parts.push(cust);

  const proj = joinHeader(DEFAULT_HEADERS.project, s.project_details);
  if (proj) parts.push(proj);

  const pr = joinHeader(DEFAULT_HEADERS.pricing, s.pricing);
  if (pr) parts.push(pr);

  const sc = joinHeader(DEFAULT_HEADERS.scope, s.scope_notes);
  if (sc) parts.push(sc);

  const kt = joinHeader(DEFAULT_HEADERS.keyTerms, s.key_terms);
  if (kt) parts.push(kt);

  const m = s.misc.trim();
  if (m) parts.push(m);

  const out = parts.join("\n\n").trim();
  return out || null;
}

/**
 * Split legacy or composed `notes` into section bodies (no leading ALL CAPS lines in each field,
 * except cover may include COUNTERTOP ESTIMATE…).
 */
export function quoteNotesToSections(notes: string | null | undefined): QuoteNotesSections {
  const out = emptyQuoteNotesSections();
  if (!notes?.trim()) return out;

  const parsed = parseStructuredQuoteNotes(notes);
  if (!parsed) {
    out.misc = notes.trim();
    return out;
  }

  const miscParts: string[] = [];

  for (const block of parsed) {
    if (block.kind === "plaintext") {
      miscParts.push(block.text);
      continue;
    }
    const body = block.bodyLines.join("\n").trimEnd();
    const title = block.title.trim();

    if (block.kind === "hero" && /^COUNTERTOP ESTIMATE/i.test(title)) {
      out.cover = body;
    } else if (block.kind === "hero" && /^CABINETRY ESTIMATE/i.test(title)) {
      out.cover = body ? `CABINETRY ESTIMATE\n${body}` : "CABINETRY ESTIMATE";
    } else if (block.kind === "hero" && /^KITCHEN COUNTERTOP/i.test(title)) {
      out.cover = body ? `${title}\n${body}` : title;
    } else if (block.kind === "hero" && /^QUOTE$/i.test(title)) {
      miscParts.push(body ? `${title}\n${body}` : title);
    } else if (/^CUSTOMER INFORMATION$/i.test(title)) {
      out.customer_information = body;
    } else if (/^CUSTOMER$/i.test(title)) {
      out.customer_information = body ? `${title}\n${body}` : title;
    } else if (/^PROJECT DETAILS$/i.test(title)) {
      out.project_details = body;
    } else if (/^PROJECT ADDRESS$/i.test(title)) {
      const chunk = joinHeader(title, body);
      if (chunk) {
        out.project_details = out.project_details ? `${out.project_details}\n\n${chunk}` : chunk;
      }
    } else if (/^PRICING\b/i.test(title)) {
      out.pricing = body;
    } else if (/^SCOPE NOTES$/i.test(title)) {
      out.scope_notes = body;
    } else if (/^KEY TERMS/i.test(title)) {
      out.key_terms = body;
    } else if (/^DETAILS\s*&\s*NOTES$/i.test(title) || /^DETAILS\s+AND\s+NOTES$/i.test(title)) {
      miscParts.push(body ? `${title}\n${body}` : title);
    } else {
      miscParts.push(body ? `${title}\n${body}` : title);
    }
  }

  if (miscParts.length) out.misc = miscParts.join("\n\n").trim();
  return out;
}

export function serializeNotesSections(s: QuoteNotesSections): Record<string, string> {
  const o: Record<string, string> = {};
  for (const k of QUOTE_NOTES_SECTION_KEYS) {
    o[k] = s[k] ?? "";
  }
  return o;
}

export function deserializeNotesSections(raw: unknown): QuoteNotesSections {
  const out = emptyQuoteNotesSections();
  if (!raw || typeof raw !== "object") return out;
  const o = raw as Record<string, unknown>;
  for (const k of QUOTE_NOTES_SECTION_KEYS) {
    if (typeof o[k] === "string") (out as Record<string, string>)[k] = o[k];
  }
  return out;
}

/** Read `ns_*` fields from a form submission. */
export function formDataToNotesSections(formData: FormData): QuoteNotesSections {
  const read = (key: keyof QuoteNotesSections) =>
    String(formData.get(`${FORM_PREFIX}${key}`) ?? "").replace(/\r\n/g, "\n");

  return {
    cover: read("cover"),
    customer_information: read("customer_information"),
    project_details: read("project_details"),
    pricing: read("pricing"),
    scope_notes: read("scope_notes"),
    key_terms: read("key_terms"),
    misc: read("misc"),
  };
}

/** Prefer stored JSON; otherwise derive from composed notes. */
export function resolveQuoteNotesSections(
  notes: string | null | undefined,
  notes_sections: unknown,
): QuoteNotesSections {
  if (notes_sections != null && typeof notes_sections === "object") {
    const d = deserializeNotesSections(notes_sections);
    const hasAny = QUOTE_NOTES_SECTION_KEYS.some((k) => d[k].trim() !== "");
    if (hasAny) return d;
  }
  return quoteNotesToSections(notes);
}
