import { describe, expect, it } from "vitest";

import {
  composeNotesFromSections,
  emptyQuoteNotesSections,
  quoteNotesToSections,
  resolveQuoteNotesSections,
  serializeNotesSections,
} from "./quote-notes-sections";

describe("quoteNotesToSections + composeNotesFromSections", () => {
  it("splits Graphman-style notes into fields", () => {
    const notes = `COUNTERTOP ESTIMATE (Quote #1)
Date: March 26, 2026

CUSTOMER INFORMATION
Name: Matt

PROJECT DETAILS
Project: Kitchen

PRICING (reference — line items control totals in the system)
• Subtotal: $1.00

SCOPE NOTES
• Note A

KEY TERMS / CONDITIONS
• Term A`;

    const s = quoteNotesToSections(notes);
    expect(s.cover).toContain("Date: March 26");
    expect(s.customer_information).toContain("Matt");
    expect(s.project_details).toContain("Kitchen");
    expect(s.pricing).toContain("Subtotal");
    expect(s.scope_notes).toContain("Note A");
    expect(s.key_terms).toContain("Term A");
  });

  it("composes from empty sections to null", () => {
    expect(composeNotesFromSections(emptyQuoteNotesSections())).toBeNull();
  });

  it("composes and parses back with stable headers", () => {
    const s = {
      ...emptyQuoteNotesSections(),
      cover: "Date: Jan 1, 2026",
      customer_information: "Name: A",
      key_terms: "• Pay 50%",
    };
    const notes = composeNotesFromSections(s);
    expect(notes).toContain("COUNTERTOP ESTIMATE");
    expect(notes).toContain("CUSTOMER INFORMATION");
    expect(notes).toContain("KEY TERMS / CONDITIONS");
    const back = quoteNotesToSections(notes ?? "");
    expect(back.cover).toContain("Jan 1");
    expect(back.customer_information).toContain("Name: A");
    expect(back.key_terms).toContain("50%");
  });

  it("resolveQuoteNotesSections prefers stored JSON when present", () => {
    const stored = serializeNotesSections({
      ...emptyQuoteNotesSections(),
      cover: "X",
    });
    const r = resolveQuoteNotesSections("COUNTERTOP ESTIMATE\nOld", stored);
    expect(r.cover).toBe("X");
  });

  it("falls back to parsing notes when JSON empty", () => {
    const notes = "COUNTERTOP ESTIMATE\nDate: 1/1/26";
    const r = resolveQuoteNotesSections(notes, {});
    expect(r.cover).toContain("Date:");
  });

  it("splits cabinetry-style template notes into structured fields (not misc-only)", () => {
    const notes = `CABINETRY ESTIMATE
Date: 3/11/26

CUSTOMER INFORMATION
(customer name)

PROJECT DETAILS
Tommy D's Custom Cabinetry Specifications
Door Style: Shaker

PRICING (reference — line items control totals in the system)
Subtotal from line items.

SCOPE NOTES
Estimate valid for 30 days.

KEY TERMS / CONDITIONS
Thank you.`;

    const s = quoteNotesToSections(notes);
    expect(s.misc.trim()).toBe("");
    expect(s.cover).toContain("CABINETRY ESTIMATE");
    expect(s.customer_information).toContain("customer name");
    expect(s.project_details).toContain("Shaker");
    expect(s.pricing).toContain("Subtotal");
    expect(s.scope_notes).toContain("30 days");
    expect(s.key_terms).toContain("Thank you");
  });
});
