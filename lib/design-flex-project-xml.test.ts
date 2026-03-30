import { describe, expect, it } from "vitest";

import { buildDesignFlexProjectXml, padSendSize } from "@/lib/design-flex-project-xml";
import type { QuoteExportPayload } from "@/lib/quote-export-xml";

const minimalPayload = (): QuoteExportPayload => ({
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  title: "Test Quote",
  status: "draft",
  workflow_stage: "estimate",
  created_at: "2026-03-30T12:00:00.000Z",
  job_id: null,
  address_line1: "123 Main St",
  address_line2: null,
  city: "Denver",
  state: "CO",
  zip: "80202",
  subtotal_cents: 10000,
  tax_cents: 700,
  total_cents: 10700,
  notes: "Note line",
  customer: { name: "Jane Doe", phone: null, email: null },
  items: [
    {
      description: "Window install",
      qty: 2,
      unit_price_cents: 5000,
      line_total_cents: 10000,
      sort_order: 0,
    },
  ],
});

describe("buildDesignFlexProjectXml", () => {
  it("emits Project root and Design Flex markers", () => {
    const xml = buildDesignFlexProjectXml(minimalPayload());
    expect(xml).toContain('<Project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
    expect(xml).toContain('xsi:noNamespaceSchemaLocation="Project.xsd"');
    expect(xml).toContain("<SendSize>");
    expect(xml).toContain("IDI-1-1001");
    expect(xml).toContain("<DocType>quote</DocType>");
    expect(xml).toMatch(/<SendSize>\d{9}<\/SendSize>/);
  });

  it("maps line description into Item", () => {
    const xml = buildDesignFlexProjectXml(minimalPayload());
    expect(xml).toContain("Window install");
  });
});

describe("padSendSize", () => {
  it("pads to 9 digits", () => {
    expect(padSendSize(123)).toBe("000000123");
    expect(padSendSize(999_999_999)).toBe("999999999");
  });
});
