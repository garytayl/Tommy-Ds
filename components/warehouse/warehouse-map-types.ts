export type WarehousePlacementKind = "window" | "door" | "screen";

export type WarehousePlacementRow = {
  id: string;
  map_id: string;
  kind: WarehousePlacementKind;
  label: string;
  pos_x: number;
  pos_y: number;
  note: string | null;
  cell_column: string | null;
  cell_row: number | null;
  stack_index: number;
};

export type WarehouseMapRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  image_path: string;
  width_px: number;
  height_px: number;
  sort_order: number;
};
