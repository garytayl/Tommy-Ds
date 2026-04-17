import { formatCellQuery, parseCellQuery } from "@/lib/warehouse-checkpoint";

/**
 * Pull valid upper-grid slot codes (A1–A10, B1–B8, C1–C8) from noisy OCR text.
 * Uses greedy left-to-right scan so "A10" wins over embedded "A1".
 */
function greedyScanSlots(compact: string): string[] {
  const found: string[] = [];
  let i = 0;
  while (i < compact.length) {
    let match: string | null = null;
    let consumed = 1;

    if (i + 3 <= compact.length) {
      const three = compact.slice(i, i + 3);
      if (/^[ABC]\d{2}$/.test(three)) {
        const p = parseCellQuery(three);
        if (p) {
          match = formatCellQuery(p.col, p.row);
          consumed = 3;
        } else {
          // e.g. A99 — looks like a two-digit row but out of range; do not match A9 from the first two chars.
          i += 1;
          continue;
        }
      }
    }

    if (!match && i + 2 <= compact.length) {
      const two = compact.slice(i, i + 2);
      if (/^[ABC]\d$/.test(two)) {
        const p = parseCellQuery(two);
        if (p) {
          match = formatCellQuery(p.col, p.row);
          consumed = 2;
        }
      }
    }

    if (match) {
      found.push(match);
      i += consumed;
    } else {
      i += 1;
    }
  }
  return found;
}

/**
 * Best guess for a single rack label photo: last slot-like token in the string.
 * Tries raw text and a variant where O → 0 (common OCR confusion in row digits).
 */
export function findWarehouseSlotInText(raw: string): string | null {
  const compact = raw.toUpperCase().replace(/[^A-C0-9]/g, "");
  const variants = [compact, compact.replace(/O/g, "0")];
  for (const v of variants) {
    const slots = greedyScanSlots(v);
    if (slots.length > 0) return slots[slots.length - 1] ?? null;
  }
  return null;
}
