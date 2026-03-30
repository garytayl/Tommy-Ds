import { describe, expect, it } from "vitest";

import { buildPonderosaEstimateTxt } from "@/lib/ponderosa-export-txt";
import type { QuoteExportPayload } from "@/lib/quote-export-xml";

const sample = (): QuoteExportPayload => ({
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  title: "Kitchen",
  status: "draft",
  workflow_stage: "estimate",
  created_at: "2026-03-30T12:00:00.000Z",
  job_id: null,
  address_line1: "1 Main",
  address_line2: null,
  city: "Denver",
  state: "CO",
  zip: "80202",
  subtotal_cents: 10000,
  tax_cents: 0,
  total_cents: 10000,
  notes: "Call first",
  customer: { name: "Jane", phone: "303", email: null },
  items: [
    {
      description: "Line A",
      qty: 1,
      unit_price_cents: 10000,
      line_total_cents: 10000,
      sort_order: 0,
    },
  ],
});

describe("buildPonderosaEstimateTxt", () => {
  it("marks estimates and includes line grid", () => {
    const t = buildPonderosaEstimateTxt(sample());
    expect(t).toContain("TOMMYDS_PONDEROSA_EXPORT");
    expect(t).toContain("KIND=ESTIMATE");
    expect(t).toContain("[LINE_ITEMS]");
    expect(t).toContain("LINE\tQTY\tUNIT_USD\tEXT_USD\tDESCRIPTION");
    expect(t).toContain("Line A");
    expect(t).toContain("\r\n");
  });

  it("marks formal quotes", () => {
    const p = sample();
    p.workflow_stage = "quote";
    expect(buildPonderosaEstimateTxt(p)).toContain("KIND=QUOTE");
  });
});
