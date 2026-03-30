import { describe, expect, it } from "vitest";

import { parseStructuredQuoteNotes, structuredQuoteNoteTitles } from "./quote-notes-parse";

describe("parseStructuredQuoteNotes", () => {
  it("parses Graphman-style countertop seed (hero, project, scope, key terms)", () => {
    const notes = `COUNTERTOP ESTIMATE (Quote #1)
Date: March 26, 2026

PROJECT DETAILS
Project: Kitchen – Granite Countertop
Color: Black Pearl (Suede Finish)

SCOPE NOTES
• Fabricator does not offer bevel edge for this material/finish

KEY TERMS / CONDITIONS
• Estimate valid for 30 days`;

    const parsed = parseStructuredQuoteNotes(notes);
    expect(parsed).not.toBeNull();
    expect(parsed!.map((b) => b.title)).toEqual([
      "COUNTERTOP ESTIMATE (Quote #1)",
      "PROJECT DETAILS",
      "SCOPE NOTES",
      "KEY TERMS / CONDITIONS",
    ]);
    expect(structuredQuoteNoteTitles(notes)).toEqual([
      "COUNTERTOP ESTIMATE (Quote #1)",
      "PROJECT DETAILS",
      "SCOPE NOTES",
      "KEY TERMS / CONDITIONS",
    ]);
  });

  it("parses customer, pricing, and key terms as separate blocks", () => {
    const notes = `COUNTERTOP ESTIMATE (Quote #1)
Date: March 26, 2026

CUSTOMER INFORMATION
Name: Matt & Wendy Graphman
Address: 1088 W Burma Road, Bloomington, IN 47404

PROJECT DETAILS
Project: Kitchen

PRICING (reference — line items control totals in the system)
• Subtotal: $1,532.45

KEY TERMS / CONDITIONS
• Estimate valid for 30 days`;

    const parsed = parseStructuredQuoteNotes(notes);
    expect(parsed).not.toBeNull();
    expect(parsed!.map((b) => b.title)).toEqual([
      "COUNTERTOP ESTIMATE (Quote #1)",
      "CUSTOMER INFORMATION",
      "PROJECT DETAILS",
      "PRICING (reference — line items control totals in the system)",
      "KEY TERMS / CONDITIONS",
    ]);
    expect(structuredQuoteNoteTitles(notes)).toEqual(parsed!.map((b) => b.title));
  });

  it("returns null for unstructured notes", () => {
    expect(parseStructuredQuoteNotes("Just some free text without headers.")).toBeNull();
    expect(structuredQuoteNoteTitles("Just some free text without headers.")).toBeNull();
  });
});
