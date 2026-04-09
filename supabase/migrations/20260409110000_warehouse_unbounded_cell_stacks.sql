-- Remove the per-cell stack cap so cells can hold more than 10 items.
-- Keep stack indexes non-negative for ordering.

alter table public.warehouse_map_placements
  drop constraint if exists warehouse_placements_stack_index_range;

alter table public.warehouse_map_placements
  add constraint warehouse_placements_stack_index_range
  check (stack_index >= 0);
