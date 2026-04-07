-- Grid cells: up to 10 stacked items per (map, column, row) via stack_index 0–9.
-- Free-placed markers keep cell_column / cell_row null and use pos_x / pos_y only.

alter table public.warehouse_map_placements
  add column if not exists cell_column text,
  add column if not exists cell_row int,
  add column if not exists stack_index int not null default 0;

alter table public.warehouse_map_placements drop constraint if exists warehouse_placements_cell_consistency;
alter table public.warehouse_map_placements add constraint warehouse_placements_cell_consistency
  check (
    (cell_column is null and cell_row is null)
    or (cell_column is not null and cell_row is not null)
  );

alter table public.warehouse_map_placements drop constraint if exists warehouse_placements_cell_column_values;
alter table public.warehouse_map_placements add constraint warehouse_placements_cell_column_values
  check (cell_column is null or cell_column in ('A', 'B', 'C'));

alter table public.warehouse_map_placements drop constraint if exists warehouse_placements_stack_index_range;
alter table public.warehouse_map_placements add constraint warehouse_placements_stack_index_range
  check (stack_index >= 0 and stack_index <= 9);

alter table public.warehouse_map_placements drop constraint if exists warehouse_placements_cell_row_by_column;
alter table public.warehouse_map_placements add constraint warehouse_placements_cell_row_by_column
  check (
    cell_column is null
    or (cell_column = 'A' and cell_row between 1 and 10)
    or (cell_column in ('B', 'C') and cell_row between 1 and 8)
  );

create unique index if not exists warehouse_map_placements_cell_stack_uniq
  on public.warehouse_map_placements (map_id, cell_column, cell_row, stack_index)
  where cell_column is not null;
