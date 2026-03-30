import { formatCents } from "@/lib/money";

import type { QuoteRevisionSnapshot } from "./quote-revisions";

function trunc(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function itemSig(it: QuoteRevisionSnapshot["items"][0]): string {
  return `${it.description}|${it.qty}|${it.unit_price_cents}|${it.line_total_cents}`;
}

/**
 * Human-readable lines describing what changed from `before` to `after`.
 * `before` is null for the oldest revision in history (nothing to diff against).
 */
export function describeQuoteSnapshotChanges(
  before: QuoteRevisionSnapshot | null | undefined,
  after: QuoteRevisionSnapshot,
): string[] {
  const lines: string[] = [];

  if (!before) {
    lines.push("First revision — no prior snapshot to compare.");
    return lines;
  }

  if (before.title !== after.title) {
    lines.push(`Title: "${trunc(before.title, 48)}" → "${trunc(after.title, 48)}"`);
  }

  const addrBefore = [before.address_line1, before.address_line2, [before.city, before.state, before.zip].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" · ");
  const addrAfter = [after.address_line1, after.address_line2, [after.city, after.state, after.zip].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" · ");
  if (addrBefore !== addrAfter) {
    lines.push("Project / service address updated");
    lines.push(`  was: ${trunc(addrBefore, 100)}`);
    lines.push(`  now: ${trunc(addrAfter, 100)}`);
  }

  const nBefore = (before.notes ?? "").trim();
  const nAfter = (after.notes ?? "").trim();
  if (nBefore !== nAfter) {
    if (!nBefore) lines.push("Notes added");
    else if (!nAfter) lines.push("Notes cleared");
    else lines.push(`Notes updated (${nBefore.length} → ${nAfter.length} characters)`);
  }

  if (before.status !== after.status) {
    lines.push(`Status: ${before.status} → ${after.status}`);
  }

  if ((before.workflow_stage ?? "") !== (after.workflow_stage ?? "")) {
    lines.push(`Stage: ${before.workflow_stage ?? "—"} → ${after.workflow_stage ?? "—"}`);
  }

  const depBefore = Boolean(before.deposit_received);
  const depAfter = Boolean(after.deposit_received);
  if (depBefore !== depAfter) {
    lines.push(`Deposit received: ${depBefore ? "yes" : "no"} → ${depAfter ? "yes" : "no"}`);
  }

  if (before.subtotal_cents !== after.subtotal_cents) {
    lines.push(`Subtotal: ${formatCents(before.subtotal_cents)} → ${formatCents(after.subtotal_cents)}`);
  }
  if (before.tax_cents !== after.tax_cents) {
    lines.push(`Tax: ${formatCents(before.tax_cents)} → ${formatCents(after.tax_cents)}`);
  }
  if (before.total_cents !== after.total_cents) {
    lines.push(`Total: ${formatCents(before.total_cents)} → ${formatCents(after.total_cents)}`);
  }

  const poBefore = JSON.stringify(before.print_overrides ?? null);
  const poAfter = JSON.stringify(after.print_overrides ?? null);
  if (poBefore !== poAfter) {
    lines.push("Print overrides changed");
  }

  const bi = before.items ?? [];
  const ai = after.items ?? [];
  if (bi.length !== ai.length) {
    lines.push(`Line item count: ${bi.length} → ${ai.length}`);
  }

  const maxLines = Math.max(bi.length, ai.length);
  for (let i = 0; i < maxLines; i++) {
    const row = i + 1;
    const p = bi[i];
    const q = ai[i];
    if (!p && q) {
      lines.push(`Line ${row} added: ${trunc(q.description, 56)} (${q.qty} × ${formatCents(q.unit_price_cents)} = ${formatCents(q.line_total_cents)})`);
      continue;
    }
    if (p && !q) {
      lines.push(`Line ${row} removed: ${trunc(p.description, 56)}`);
      continue;
    }
    if (p && q) {
      if (itemSig(p) === itemSig(q)) continue;
      const bits: string[] = [];
      if (p.description !== q.description) bits.push("description");
      if (Number(p.qty) !== Number(q.qty)) bits.push("qty");
      if (p.unit_price_cents !== q.unit_price_cents) bits.push("unit price");
      if (p.line_total_cents !== q.line_total_cents) bits.push("line total");
      if (bits.length > 0) {
        lines.push(`Line ${row} (${trunc(p.description, 36)}): changed ${bits.join(", ")}`);
        if (p.description !== q.description) {
          lines.push(`  → "${trunc(q.description, 64)}"`);
        }
        if (Number(p.qty) !== Number(q.qty) || p.unit_price_cents !== q.unit_price_cents) {
          lines.push(`  → ${q.qty} × ${formatCents(q.unit_price_cents)} (${formatCents(q.line_total_cents)})`);
        }
      }
    }
  }

  if (lines.length === 0) {
    lines.push("No field-level differences detected vs previous revision (label may still differ).");
  }

  return lines;
}
