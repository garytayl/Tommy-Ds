import { describe, expect, it } from "vitest";

import {
  BLANK_QUOTE_TEMPLATE_ID,
  KITCHEN_QUARTZ_EXTENDED_FLUSH_COUNTERTOP_TEMPLATE_ID,
  mergeQuoteTemplateDefinitions,
  normalizeTemplateIdInList,
  toQuoteTemplateClientOptions,
  TOMMY_DS_CABINETRY_ESTIMATE_TEMPLATE_ID,
  VW_STONE_WORX_COUNTERTOP_TEMPLATE_ID,
  type QuoteTemplateDbRow,
} from "./quote-templates";

describe("mergeQuoteTemplateDefinitions", () => {
  it("places built-ins first and appends DB rows", () => {
    const db: QuoteTemplateDbRow[] = [
      {
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        name: "Custom A",
        description: "d",
        default_title: "t",
        notes_text: "n",
        line_items: [],
        sort_order: 0,
      },
    ];
    const merged = mergeQuoteTemplateDefinitions(db);
    expect(merged[0]?.id).toBe(BLANK_QUOTE_TEMPLATE_ID);
    expect(merged[1]?.id).toBe(VW_STONE_WORX_COUNTERTOP_TEMPLATE_ID);
    expect(merged[2]?.id).toBe(TOMMY_DS_CABINETRY_ESTIMATE_TEMPLATE_ID);
    expect(merged[3]?.id).toBe(KITCHEN_QUARTZ_EXTENDED_FLUSH_COUNTERTOP_TEMPLATE_ID);
    expect(merged[4]?.id).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
  });
});

describe("normalizeTemplateIdInList", () => {
  const defs = mergeQuoteTemplateDefinitions([]);

  it("returns blank for unknown ids", () => {
    expect(normalizeTemplateIdInList("not-a-template", defs)).toBe(BLANK_QUOTE_TEMPLATE_ID);
  });

  it("keeps valid built-in ids", () => {
    expect(normalizeTemplateIdInList(VW_STONE_WORX_COUNTERTOP_TEMPLATE_ID, defs)).toBe(
      VW_STONE_WORX_COUNTERTOP_TEMPLATE_ID,
    );
    expect(normalizeTemplateIdInList(TOMMY_DS_CABINETRY_ESTIMATE_TEMPLATE_ID, defs)).toBe(
      TOMMY_DS_CABINETRY_ESTIMATE_TEMPLATE_ID,
    );
    expect(normalizeTemplateIdInList(KITCHEN_QUARTZ_EXTENDED_FLUSH_COUNTERTOP_TEMPLATE_ID, defs)).toBe(
      KITCHEN_QUARTZ_EXTENDED_FLUSH_COUNTERTOP_TEMPLATE_ID,
    );
  });
});

describe("toQuoteTemplateClientOptions", () => {
  it("produces only JSON-serializable fields for RSC → client props", () => {
    const opts = toQuoteTemplateClientOptions(mergeQuoteTemplateDefinitions([]));
    expect(opts.length).toBeGreaterThan(0);
    for (const o of opts) {
      expect(() => JSON.stringify(o)).not.toThrow();
      expect(typeof o.defaultNotes).toBe("string");
    }
  });
});
