/**
 * Upper warehouse floor diagram (see public/warehouse/upper-floor-plan.svg):
 * Inner grid: x=72..928, y=96..584 on a 1000×640 artboard.
 * Column A: 10 rows · B & C: 8 rows each.
 */

export type WarehouseColumn = "A" | "B" | "C";

const IMAGE_W = 1000;
const IMAGE_H = 640;
const INNER_LEFT = 72;
const INNER_TOP = 96;
const INNER_W = 856;
const INNER_H = 488;

const COL_W = INNER_W / 3;

export function maxRowForColumn(col: WarehouseColumn): number {
  return col === "A" ? 10 : 8;
}

export function cellKey(col: WarehouseColumn, row: number): string {
  return `${col}${row}`;
}

/** Normalized 0–1 (same convention as Leaflet placement: x left→right, y top→bottom for pos_y). */
export function cellCenterNormalized(col: WarehouseColumn, row: number): { pos_x: number; pos_y: number } {
  const rowCount = maxRowForColumn(col);
  if (row < 1 || row > rowCount) {
    throw new RangeError(`Invalid row ${row} for column ${col}`);
  }
  const colIndex = col === "A" ? 0 : col === "B" ? 1 : 2;
  const centerX = INNER_LEFT + colIndex * COL_W + COL_W / 2;
  const rowH = INNER_H / rowCount;
  const centerY = INNER_TOP + (row - 0.5) * rowH;
  return {
    pos_x: centerX / IMAGE_W,
    pos_y: 1 - centerY / IMAGE_H,
  };
}

/** Infer nearest column + row from normalized click (for optional snapping). */
export function nearestCellFromNormalized(pos_x: number, pos_y: number): {
  col: WarehouseColumn;
  row: number;
} {
  const xPx = pos_x * IMAGE_W;
  const yPx = (1 - pos_y) * IMAGE_H;
  const innerX = Math.min(Math.max(xPx - INNER_LEFT, 0), INNER_W - 1e-6);
  const colIndex = Math.min(Math.floor(innerX / COL_W), 2);
  const col: WarehouseColumn = colIndex === 0 ? "A" : colIndex === 1 ? "B" : "C";
  const innerY = Math.min(Math.max(yPx - INNER_TOP, 0), INNER_H - 1e-6);
  const rowCount = maxRowForColumn(col);
  const row = Math.min(rowCount, Math.max(1, Math.floor(innerY / (INNER_H / rowCount)) + 1));
  return { col, row };
}
