import { describe, expect, it } from "vitest";

import { describeQuoteSnapshotChanges, notesChangedMiddleExcerpts } from "./quote-revision-diff";
import type { QuoteRevisionSnapshot } from "./quote-revisions";

const baseSnap = (): QuoteRevisionSnapshot => ({
  title: "T",
  address_line1: "",
  address_line2: null,
  city: "",
  state: "",
  zip: "",
  status: "draft",
  notes: null,
  subtotal_cents: 0,
  tax_cents: 0,
  total_cents: 0,
  print_overrides: null,
  items: [],
});

describe("notesChangedMiddleExcerpts", () => {
  it("isolates inserted text between common prefix and suffix", () => {
    const { before, after } = notesChangedMiddleExcerpts("hello world", "hello there world", 80);
    expect(before).toBe("");
    // Middle excerpt is trimmed for display
    expect(after).toBe("there");
  });

  it("shows both sides when middle of string changes", () => {
    const { before, after } = notesChangedMiddleExcerpts("foo OLD bar", "foo NEW bar", 80);
    expect(before).toContain("OLD");
    expect(after).toContain("NEW");
  });
});

describe("describeQuoteSnapshotChanges notes", () => {
  it("includes removed/added excerpts when notes change", () => {
    const before = { ...baseSnap(), notes: "Section A\n\nSection B" };
    const after = { ...baseSnap(), notes: "Section A\n\nSection B edited" };
    const lines = describeQuoteSnapshotChanges(before, after);
    expect(lines.some((l) => l.includes("Notes: text changed"))).toBe(true);
    expect(lines.some((l) => l.startsWith("  added:") || l.startsWith("  removed:"))).toBe(true);
  });
});
