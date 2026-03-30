import { describe, expect, it } from "vitest";

import { buildRevisionSnapshot, type QuoteRevisionSnapshot } from "@/lib/quote-revisions";

import { canonicalSnapshotString, findMatchingRevisionNumber, normalizeSnapshotFromUnknown } from "./quote-revision-record";

describe("canonicalSnapshotString", () => {
  it("matches when stored snapshot omits deposit_received but live has false", () => {
    const live = buildRevisionSnapshot({
      quote: {
        title: "T",
        address_line1: "1 Main",
        address_line2: null,
        city: "C",
        state: "IN",
        zip: "47404",
        status: "draft",
        workflow_stage: "estimate",
        notes: null,
        subtotal_cents: 100,
        tax_cents: 7,
        total_cents: 107,
        deposit_received: false,
        print_overrides: null,
      },
      items: [],
    });

    const storedOlder: Record<string, unknown> = {
      title: "T",
      address_line1: "1 Main",
      address_line2: null,
      city: "C",
      state: "IN",
      zip: "47404",
      status: "draft",
      workflow_stage: "estimate",
      notes: null,
      subtotal_cents: 100,
      tax_cents: 7,
      total_cents: 107,
      print_overrides: null,
      items: [],
    };

    expect(canonicalSnapshotString(live)).toBe(canonicalSnapshotString(storedOlder));
  });

  it("matches print_overrides with different key order", () => {
    const a: QuoteRevisionSnapshot = {
      title: "T",
      address_line1: "1",
      address_line2: null,
      city: "C",
      state: "IN",
      zip: "1",
      status: "draft",
      notes: null,
      subtotal_cents: 0,
      tax_cents: 0,
      total_cents: 0,
      deposit_received: false,
      print_overrides: { hide_notes: true, doc_label: "Q" },
      items: [],
    };
    const b: QuoteRevisionSnapshot = {
      ...a,
      print_overrides: { doc_label: "Q", hide_notes: true },
    };
    expect(canonicalSnapshotString(a)).toBe(canonicalSnapshotString(b));
  });

  it("findMatchingRevisionNumber returns rev when fingerprints align", () => {
    const live = buildRevisionSnapshot({
      quote: {
        title: "T",
        address_line1: "1",
        address_line2: null,
        city: "C",
        state: "IN",
        zip: "1",
        status: "draft",
        workflow_stage: "estimate",
        notes: "n",
        subtotal_cents: 0,
        tax_cents: 0,
        total_cents: 0,
        deposit_received: false,
        print_overrides: null,
      },
      items: [],
    });

    const rev = {
      revision_number: 3,
      snapshot: normalizeSnapshotFromUnknown(JSON.parse(JSON.stringify(live))),
    };

    expect(findMatchingRevisionNumber([rev], live)).toBe(3);
  });
});
