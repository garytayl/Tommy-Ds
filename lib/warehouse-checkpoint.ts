import type { WarehouseColumn } from "@/lib/warehouse-grid";
import { maxRowForColumn } from "@/lib/warehouse-grid";

/** Parse `A3`, `b12` → column + row for grid checkpoints (matches warehouse floor grid). */
export function parseCellQuery(param: string | null): { col: WarehouseColumn; row: number } | null {
  if (!param) return null;
  const m = /^([ABCabc])(\d{1,2})$/.exec(param.trim());
  if (!m) return null;
  const col = m[1].toUpperCase() as WarehouseColumn;
  if (col !== "A" && col !== "B" && col !== "C") return null;
  const row = parseInt(m[2], 10);
  if (!Number.isFinite(row) || row < 1) return null;
  const max = maxRowForColumn(col);
  if (row > max) return null;
  return { col, row };
}

export function formatCellQuery(col: WarehouseColumn, row: number): string {
  return `${col}${row}`;
}

export type WarehouseCheckpointParams = {
  mapSlug: string;
  cell?: string;
  placement?: string;
  /** Shown large after scan (e.g. Bay 2 · North aisle). */
  title?: string;
  /** Customer UUID — pull list loads on checkpoint screen when signed in with access. */
  customer?: string;
};

export function buildWarehouseCheckpointPath(p: WarehouseCheckpointParams): string {
  const u = new URLSearchParams();
  u.set("map", p.mapSlug);
  if (p.cell) u.set("cell", p.cell);
  if (p.placement) u.set("placement", p.placement);
  if (p.title?.trim()) u.set("title", p.title.trim());
  if (p.customer?.trim()) u.set("customer", p.customer.trim());
  return `/warehouse?${u.toString()}`;
}
