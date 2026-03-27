"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { ItemLike, MergedQuotePrint, QuotePrintLineOverride, QuotePrintOverrides } from "@/lib/quote-print-overrides";
import { centsToDollars } from "@/lib/money";

import { clearQuotePrintOverrides, saveQuotePrintOverrides } from "./actions";

type Props = {
  quoteId: string;
  merged: MergedQuotePrint;
  hasSavedOverrides: boolean;
};

function lineToOverride(row: ItemLike): QuotePrintLineOverride {
  return {
    description: row.description,
    qty: Number(row.qty),
    unit_price_cents: row.unit_price_cents,
    line_total_cents: row.line_total_cents,
  };
}

export function QuotePrintEditorForm({ quoteId, merged, hasSavedOverrides }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(merged.title);
  const [docLabel, setDocLabel] = useState(merged.docLabel);
  const [preparedDateText, setPreparedDateText] = useState(merged.preparedDateText);
  const [customerName, setCustomerName] = useState(merged.customerName);
  const [customerPhone, setCustomerPhone] = useState(merged.customerPhone ?? "");
  const [customerEmail, setCustomerEmail] = useState(merged.customerEmail ?? "");
  const [projectAddress, setProjectAddress] = useState(merged.projectAddress);
  const [notes, setNotes] = useState(merged.notes ?? "");
  const [hideLineItems, setHideLineItems] = useState(merged.hideLineItems);
  const [hideCustomerPhone, setHideCustomerPhone] = useState(merged.hideCustomerPhone);
  const [hideCustomerEmail, setHideCustomerEmail] = useState(merged.hideCustomerEmail);
  const [hideProjectAddress, setHideProjectAddress] = useState(merged.hideProjectAddress);
  const [hideNotes, setHideNotes] = useState(merged.hideNotes);
  const [hideQty, setHideQty] = useState(merged.hideQty);
  const [hideUnitPrices, setHideUnitPrices] = useState(merged.hideUnitPrices);
  const [hideSubtotalTax, setHideSubtotalTax] = useState(merged.hideSubtotalTax);
  const [hideReference, setHideReference] = useState(merged.hideReference);
  const [footerNote, setFooterNote] = useState(merged.footerNote ?? "");
  const [lines, setLines] = useState<ItemLike[]>(() => merged.items.map((r) => ({ ...r })));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const payload = useMemo((): QuotePrintOverrides => {
    const base: QuotePrintOverrides = {
      title,
      doc_label: docLabel.trim() || null,
      prepared_date_text: preparedDateText.trim() || null,
      customer_name: customerName.trim() || null,
      customer_phone: customerPhone.trim() || null,
      customer_email: customerEmail.trim() || null,
      project_address: projectAddress.trim() || null,
      notes,
      hide_line_items: hideLineItems,
      hide_customer_phone: hideCustomerPhone,
      hide_customer_email: hideCustomerEmail,
      hide_project_address: hideProjectAddress,
      hide_notes: hideNotes,
      hide_qty: hideQty,
      hide_unit_prices: hideUnitPrices,
      hide_subtotal_tax: hideSubtotalTax,
      hide_reference: hideReference,
      footer_note: footerNote.trim() || null,
    };
    if (lines.length > 0) {
      base.line_items = lines.map(lineToOverride);
    }
    return base;
  }, [
    title,
    docLabel,
    preparedDateText,
    customerName,
    customerPhone,
    customerEmail,
    projectAddress,
    notes,
    hideLineItems,
    hideCustomerPhone,
    hideCustomerEmail,
    hideProjectAddress,
    hideNotes,
    hideQty,
    hideUnitPrices,
    hideSubtotalTax,
    hideReference,
    footerNote,
    lines,
  ]);

  function updateLine(i: number, patch: Partial<ItemLike>) {
    setLines((prev) => {
      const next = [...prev];
      const row = { ...next[i], ...patch };
      if (patch.qty !== undefined || patch.unit_price_cents !== undefined) {
        const qty = Number(row.qty);
        const unit = row.unit_price_cents;
        if (Number.isFinite(qty) && Number.isFinite(unit)) {
          row.line_total_cents = Math.round(qty * unit);
        }
      }
      next[i] = row;
      return next;
    });
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { description: "", qty: 1, unit_price_cents: 0, line_total_cents: 0 },
    ]);
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, j) => j !== i));
  }

  async function onSave() {
    setErrorMessage(null);
    startTransition(async () => {
      const r = await saveQuotePrintOverrides(quoteId, payload);
      if (!r.ok) {
        setErrorMessage(r.message);
        return;
      }
      setClearConfirmOpen(false);
      router.refresh();
    });
  }

  async function onClearConfirm() {
    setErrorMessage(null);
    startTransition(async () => {
      const r = await clearQuotePrintOverrides(quoteId);
      if (!r.ok) {
        setErrorMessage(r.message);
        return;
      }
      setClearConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}
      {hasSavedOverrides && (
        <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
          This quote has saved print overrides. They are used only for PDF/print — not the live line items on the
          quote unless you also change those above.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Document title</span>
          <input className="field mt-1 w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Document label (header)</span>
          <input
            className="field mt-1 w-full"
            value={docLabel}
            onChange={(e) => setDocLabel(e.target.value)}
            placeholder="e.g. Estimate, Formal quote"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Prepared date (exactly as printed)</span>
        <input className="field mt-1 w-full max-w-md" value={preparedDateText} onChange={(e) => setPreparedDateText(e.target.value)} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Customer name</span>
          <input className="field mt-1 w-full" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Phone</span>
          <input className="field mt-1 w-full" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Email</span>
          <input
            type="email"
            className="field mt-1 w-full"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Project address</span>
        <textarea className="field mt-1 min-h-[4rem] w-full" value={projectAddress} onChange={(e) => setProjectAddress(e.target.value)} />
      </label>

      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <h3 className="text-sm font-semibold text-foreground">What the customer sees on the PDF</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          These only affect the printed / previewed estimate — not the live quote in admin.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <input
              id="pv-hide-line-items"
              type="checkbox"
              checked={hideLineItems}
              onChange={(e) => setHideLineItems(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
            />
            <label htmlFor="pv-hide-line-items" className="cursor-pointer leading-snug">
              Hide entire pricing table and totals
            </label>
          </li>
          <li className="flex items-start gap-2">
            <input
              id="pv-hide-phone"
              type="checkbox"
              checked={hideCustomerPhone}
              onChange={(e) => setHideCustomerPhone(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
            />
            <label htmlFor="pv-hide-phone" className="cursor-pointer leading-snug">
              Hide customer phone on the Customer card
            </label>
          </li>
          <li className="flex items-start gap-2">
            <input
              id="pv-hide-email"
              type="checkbox"
              checked={hideCustomerEmail}
              onChange={(e) => setHideCustomerEmail(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
            />
            <label htmlFor="pv-hide-email" className="cursor-pointer leading-snug">
              Hide customer email on the Customer card
            </label>
          </li>
          <li className="flex items-start gap-2">
            <input
              id="pv-hide-project"
              type="checkbox"
              checked={hideProjectAddress}
              onChange={(e) => setHideProjectAddress(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
            />
            <label htmlFor="pv-hide-project" className="cursor-pointer leading-snug">
              Hide project address section
            </label>
          </li>
          <li className="flex items-start gap-2">
            <input
              id="pv-hide-notes"
              type="checkbox"
              checked={hideNotes}
              onChange={(e) => setHideNotes(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
            />
            <label htmlFor="pv-hide-notes" className="cursor-pointer leading-snug">
              Hide scope / notes page (page 2)
            </label>
          </li>
          <li className="flex items-start gap-2">
            <input
              id="pv-hide-ref"
              type="checkbox"
              checked={hideReference}
              onChange={(e) => setHideReference(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
            />
            <label htmlFor="pv-hide-ref" className="cursor-pointer leading-snug">
              Hide reference number under the date
            </label>
          </li>
          <li className="flex items-start gap-2">
            <input
              id="pv-hide-qty"
              type="checkbox"
              checked={hideQty}
              disabled={hideLineItems}
              onChange={(e) => setHideQty(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border disabled:opacity-40"
            />
            <label htmlFor="pv-hide-qty" className={`cursor-pointer leading-snug ${hideLineItems ? "text-muted-foreground" : ""}`}>
              Hide Qty column in pricing table
            </label>
          </li>
          <li className="flex items-start gap-2">
            <input
              id="pv-hide-unit"
              type="checkbox"
              checked={hideUnitPrices}
              disabled={hideLineItems}
              onChange={(e) => setHideUnitPrices(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border disabled:opacity-40"
            />
            <label htmlFor="pv-hide-unit" className={`cursor-pointer leading-snug ${hideLineItems ? "text-muted-foreground" : ""}`}>
              Hide Unit price column in pricing table
            </label>
          </li>
          <li className="flex items-start gap-2">
            <input
              id="pv-hide-subtax"
              type="checkbox"
              checked={hideSubtotalTax}
              disabled={hideLineItems}
              onChange={(e) => setHideSubtotalTax(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border disabled:opacity-40"
            />
            <label htmlFor="pv-hide-subtax" className={`cursor-pointer leading-snug ${hideLineItems ? "text-muted-foreground" : ""}`}>
              Hide subtotal and tax rows (show grand total only)
            </label>
          </li>
        </ul>
      </div>

      {!hideLineItems && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Line items (print)</h3>
            <button type="button" className="btn-secondary text-xs" onClick={addLine}>
              Add row
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Totals below follow these rows (subtotal = sum of line totals; total = subtotal + tax from the quote).
          </p>
          <div className="mt-2 space-y-2 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-2">Description</th>
                  <th className="w-20 py-2 pr-2">Qty</th>
                  <th className="w-28 py-2 pr-2">Unit ($)</th>
                  <th className="w-28 py-2 pr-2">Line ($)</th>
                  <th className="w-12 py-2" />
                </tr>
              </thead>
              <tbody>
                {lines.map((row, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-1.5 pr-2 align-top">
                      <input
                        className="field w-full min-w-[12rem] py-1.5 text-sm"
                        value={row.description}
                        onChange={(e) => updateLine(i, { description: e.target.value })}
                      />
                    </td>
                    <td className="py-1.5 pr-2 align-top">
                      <input
                        type="number"
                        className="field w-full py-1.5 text-sm"
                        min="0"
                        step="0.01"
                        value={row.qty}
                        onChange={(e) => updateLine(i, { qty: Number.parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="py-1.5 pr-2 align-top">
                      <input
                        type="number"
                        className="field w-full py-1.5 text-sm"
                        min="0"
                        step="0.01"
                        value={centsToDollars(row.unit_price_cents).toFixed(2)}
                        onChange={(e) =>
                          updateLine(i, { unit_price_cents: Math.round(Number.parseFloat(e.target.value || "0") * 100) })
                        }
                      />
                    </td>
                    <td className="py-1.5 pr-2 align-top">
                      <input
                        type="number"
                        className="field w-full py-1.5 text-sm"
                        min="0"
                        step="0.01"
                        value={centsToDollars(row.line_total_cents).toFixed(2)}
                        onChange={(e) =>
                          updateLine(i, { line_total_cents: Math.round(Number.parseFloat(e.target.value || "0") * 100) })
                        }
                      />
                    </td>
                    <td className="py-1.5 align-top">
                      <button type="button" className="text-xs text-destructive hover:underline" onClick={() => removeLine(i)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Notes / details block</span>
        <textarea
          className="field mt-1 min-h-[12rem] w-full font-mono text-sm leading-relaxed"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Shown in the estimate details section on the PDF"
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Extra footer note (optional)</span>
        <textarea className="field mt-1 min-h-[3rem] w-full text-sm" value={footerNote} onChange={(e) => setFooterNote(e.target.value)} />
      </label>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2"
          disabled={pending}
          onClick={() => void onSave()}
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            "Save print version"
          )}
        </button>
        {clearConfirmOpen ? (
          <div className="w-full max-w-md rounded-lg border border-destructive/40 bg-destructive/5 p-3 sm:w-auto">
            <p className="text-sm text-foreground">Clear all print-only edits and use live quote data on the PDF?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-danger text-xs"
                disabled={pending}
                onClick={() => void onClearConfirm()}
              >
                Yes, reset
              </button>
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={pending}
                onClick={() => setClearConfirmOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn-secondary"
            disabled={pending}
            onClick={() => setClearConfirmOpen(true)}
          >
            Reset to live quote
          </button>
        )}
        <Link href={`/admin/quotes/${quoteId}/print`} target="_blank" rel="noreferrer" className="btn-primary">
          Preview PDF
        </Link>
        <Link href={`/admin/quotes/${quoteId}`} className="link text-sm">
          Back to quote
        </Link>
      </div>
    </div>
  );
}
