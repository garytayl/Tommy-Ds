/**
 * Multi-field estimate scope: stored as JSON on quotes.notes_sections, composed into quotes.notes
 * for print, revisions, and legacy consumers.
 */

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

/** COUNTERTOP block: allow full first line inside the field. */
function composeCover(cover: string): string | null {
  const c = cover.trim();
  if (!c) return null;
  if (/^COUNTERTOP ESTIMATE/i.test(c)) return c;
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
