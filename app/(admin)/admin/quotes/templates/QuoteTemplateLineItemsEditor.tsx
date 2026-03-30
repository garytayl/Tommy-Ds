"use client";

import { useMemo, useState } from "react";

import { centsToDollars } from "@/lib/money";
import { type QuoteTemplateLineItem, QUOTE_TEMPLATE_LINE_ITEM_EDITOR_PLACEHOLDER } from "@/lib/quote-templates";

function dollarsInput(cents: number): string {
  if (cents === 0) return "";
  return centsToDollars(cents).toFixed(2);
}

function rowToPayload(description: string, qtyStr: string, unitDollarsStr: string): QuoteTemplateLineItem | null {
  const descriptionTrim = description.trim();
  if (!descriptionTrim) return null;
  const qty = Math.max(0.0001, Number.parseFloat(qtyStr) || 1);
  const unitDollars = Number.parseFloat(unitDollarsStr);
  const unit_price_cents = Number.isFinite(unitDollars) ? Math.round(unitDollars * 100) : 0;
  const line_total_cents = Math.round(qty * unit_price_cents);
  return {
    description: descriptionTrim,
    qty,
    unit_price_cents,
    line_total_cents,
  };
}

type RowState = { description: string; qty: string; unitDollars: string };

function lineItemsToRows(items: QuoteTemplateLineItem[]): RowState[] {
  if (items.length === 0) return [{ description: "", qty: "1", unitDollars: "" }];
  return items.map((i) => ({
    description: i.description,
    qty: String(i.qty),
    unitDollars: dollarsInput(i.unit_price_cents),
  }));
}

export function QuoteTemplateLineItemsEditor({
  initialLineItems,
  fieldName = "line_items_json",
}: {
  initialLineItems: QuoteTemplateLineItem[];
  fieldName?: string;
}) {
  const [rows, setRows] = useState<RowState[]>(() => lineItemsToRows(initialLineItems));

  const jsonPayload = useMemo(() => {
    const items: QuoteTemplateLineItem[] = [];
    for (const r of rows) {
      const row = rowToPayload(r.description, r.qty, r.unitDollars);
      if (row) items.push(row);
    }
    return JSON.stringify(items);
  }, [rows]);

  function addRow() {
    setRows((prev) => [...prev, { description: "", qty: "1", unitDollars: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [{ description: "", qty: "1", unitDollars: "" }];
    });
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={fieldName} value={jsonPayload} />
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-[1fr_5rem_7rem_auto] sm:items-end"
          >
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
              <input
                type="text"
                value={row.description}
                onChange={(e) =>
                  setRows((prev) => {
                    const copy = [...prev];
                    copy[index] = { ...copy[index], description: e.target.value };
                    return copy;
                  })
                }
                placeholder={QUOTE_TEMPLATE_LINE_ITEM_EDITOR_PLACEHOLDER}
                className="field w-full placeholder:text-muted-foreground/70"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Qty</label>
              <input
                type="text"
                inputMode="decimal"
                value={row.qty}
                onChange={(e) =>
                  setRows((prev) => {
                    const copy = [...prev];
                    copy[index] = { ...copy[index], qty: e.target.value };
                    return copy;
                  })
                }
                className="field w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Unit $</label>
              <input
                type="text"
                inputMode="decimal"
                value={row.unitDollars}
                onChange={(e) =>
                  setRows((prev) => {
                    const copy = [...prev];
                    copy[index] = { ...copy[index], unitDollars: e.target.value };
                    return copy;
                  })
                }
                placeholder="0.00"
                className="field w-full"
              />
            </div>
            <div className="flex justify-end pb-0.5 sm:justify-center">
              <button
                type="button"
                className="text-xs font-medium text-muted-foreground hover:text-destructive"
                onClick={() => removeRow(index)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={addRow}>
        + Add line item
      </button>
    </div>
  );
}
